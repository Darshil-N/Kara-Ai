const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Email transporter (using Gmail as example)
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // Use App Password for Gmail
  }
});

// Function to send email reminder
async function sendEmailReminder(interview, reminderData) {
  const scheduledDate = new Date(interview.scheduled_date);
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: reminderData.recipient_contact,
    subject: `🎯 Interview Reminder: ${interview.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">🎯 Interview Reminder</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your practice session is starting soon!</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <h2 style="color: #333; margin-top: 0;">${interview.title}</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #666;"><strong>📅 Date:</strong> ${scheduledDate.toLocaleDateString()}</p>
            <p style="margin: 10px 0 0 0; color: #666;"><strong>⏰ Time:</strong> ${scheduledDate.toLocaleTimeString()}</p>
            <p style="margin: 10px 0 0 0; color: #666;"><strong>⏱️ Duration:</strong> ${interview.duration_minutes} minutes</p>
            ${interview.target_role ? `<p style="margin: 10px 0 0 0; color: #666;"><strong>🎯 Role:</strong> ${interview.target_role}</p>` : ''}
            ${interview.interview_style ? `<p style="margin: 10px 0 0 0; color: #666;"><strong>📋 Style:</strong> ${interview.interview_style}</p>` : ''}
          </div>
          
          ${interview.description ? `
            <div style="margin: 20px 0;">
              <h3 style="color: #333; margin-bottom: 10px;">📝 Notes:</h3>
              <p style="color: #666; margin: 0;">${interview.description}</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL}/interview-setup" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              🚀 Start Interview
            </a>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #999; font-size: 14px; margin: 0;">
              Good luck with your practice session! 💪<br>
              You can also access your interview from the <a href="${process.env.APP_URL}/dashboard">dashboard</a>.
            </p>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            This is an automated reminder from Kara AI Interview Platform<br>
            If you don't want to receive these reminders, you can update your preferences in your account settings.
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email reminder sent successfully for interview: ${interview.title}`);
    return true;
  } catch (error) {
    console.error('Error sending email reminder:', error);
    return false;
  }
}

// Function to check and send due reminders
async function processPendingReminders() {
  try {
    const now = new Date().toISOString();
    
    // Get pending reminders that are due
    const { data: reminders, error } = await supabase
      .from('interview_reminders')
      .select(`
        *,
        scheduled_interviews!inner(*)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now);

    if (error) {
      console.error('Error fetching pending reminders:', error);
      return;
    }

    console.log(`Processing ${reminders?.length || 0} pending reminders...`);

    for (const reminder of reminders || []) {
      const interview = reminder.scheduled_interviews;
      
      // Skip if interview is cancelled or completed
      if (interview.status !== 'scheduled') {
        continue;
      }

      let success = false;

      if (reminder.reminder_type === 'email') {
        success = await sendEmailReminder(interview, reminder);
      }
      // Add SMS functionality here later
      // else if (reminder.reminder_type === 'sms') {
      //   success = await sendSMSReminder(interview, reminder);
      // }

      // Mark reminder as sent or failed
      await supabase
        .from('interview_reminders')
        .update({
          status: success ? 'sent' : 'failed',
          sent_at: new Date().toISOString()
        })
        .eq('id', reminder.id);

      // Mark the interview reminder as sent
      if (success && reminder.reminder_type === 'email') {
        await supabase
          .from('scheduled_interviews')
          .update({ reminder_sent: true })
          .eq('id', interview.id);
      }
    }
  } catch (error) {
    console.error('Error processing pending reminders:', error);
  }
}

// API endpoint to manually trigger reminder processing
app.post('/api/process-reminders', async (req, res) => {
  try {
    await processPendingReminders();
    res.json({ success: true, message: 'Reminders processed successfully' });
  } catch (error) {
    console.error('Error processing reminders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to send test email
app.post('/api/test-email', async (req, res) => {
  try {
    const testMailOptions = {
      from: process.env.EMAIL_USER,
      to: req.body.email,
      subject: '🧪 Test Email from Kara AI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>🎉 Email Service is Working!</h2>
          <p>This is a test email to confirm that the email service is configured correctly.</p>
          <p>You should now receive interview reminders when you schedule practice sessions.</p>
        </div>
      `
    };

    await transporter.sendMail(testMailOptions);
    res.json({ success: true, message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Kara AI Reminder Service',
    timestamp: new Date().toISOString()
  });
});

// Schedule reminder processing every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('Running reminder check at', new Date().toISOString());
  processPendingReminders();
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Reminder service running on port ${PORT}`);
  console.log('📧 Email reminders will be processed every 5 minutes');
  
  // Run initial check
  setTimeout(() => {
    processPendingReminders();
  }, 5000);
});

module.exports = app;
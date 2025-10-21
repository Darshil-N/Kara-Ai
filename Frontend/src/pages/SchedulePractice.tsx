import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Mail, MessageSquare, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { schedulingService, CreateScheduledInterviewData } from '@/lib/databaseService';

const targetRoles = [
  'Software Engineer',
  'Product Manager', 
  'Data Scientist',
  'UX Designer',
  'Sales Representative',
  'Marketing Manager',
  'Business Analyst',
  'DevOps Engineer'
];

const interviewStyles = [
  'Technical Interview',
  'Behavioral Interview', 
  'System Design',
  'Case Study',
  'Presentation',
  'Phone Screening'
];

const interviewerTypes = [
  'AI Assistant',
  'Senior Professional',
  'Hiring Manager',
  'Technical Lead'
];

const reminderOptions = [
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' }
];

export default function SchedulePractice() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetRole: '',
    interviewStyle: '',
    interviewerType: '',
    scheduledDate: '',
    scheduledTime: '',
    durationMinutes: 30,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    emailReminder: true,
    smsReminder: false,
    reminderMinutes: 30
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.scheduledDate || !formData.scheduledTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      
      if (scheduledDateTime <= new Date()) {
        toast({
          title: "Invalid Date",
          description: "Please schedule the interview for a future date and time.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const scheduleData: CreateScheduledInterviewData = {
        title: formData.title,
        description: formData.description,
        target_role: formData.targetRole,
        interview_style: formData.interviewStyle,
        interviewer_type: formData.interviewerType,
        scheduled_date: scheduledDateTime.toISOString(),
        duration_minutes: formData.durationMinutes,
        timezone: formData.timezone,
        email_reminder: formData.emailReminder,
        sms_reminder: formData.smsReminder,
        reminder_minutes_before: formData.reminderMinutes
      };

      await schedulingService.createScheduledInterview(scheduleData);
      
      toast({
        title: "Interview Scheduled! 🎉",
        description: `Your practice interview is scheduled for ${scheduledDateTime.toLocaleDateString()} at ${scheduledDateTime.toLocaleTimeString()}.`,
      });

      // Navigate to upcoming interviews or dashboard
      navigate('/dashboard?tab=upcoming');
      
    } catch (error) {
      console.error('Error scheduling interview:', error);
      toast({
        title: "Scheduling Failed",
        description: "There was an error scheduling your interview. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateTitle = () => {
    if (formData.targetRole && formData.interviewStyle) {
      const title = `${formData.targetRole} - ${formData.interviewStyle}`;
      handleInputChange('title', title);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center mb-8">
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-4"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Schedule Practice Interview</h1>
              <p className="text-muted-foreground">Plan your practice session and get reminders</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Interview Details
                    </CardTitle>
                    <CardDescription>
                      Set up your practice interview configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Interview Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="e.g., Software Engineer - Technical Interview"
                        required
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={generateTitle}
                        disabled={!formData.targetRole || !formData.interviewStyle}
                      >
                        Auto-generate title
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Optional notes about this interview session..."
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="targetRole">Target Role</Label>
                        <Select value={formData.targetRole} onValueChange={(value) => handleInputChange('targetRole', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {targetRoles.map((role) => (
                              <SelectItem key={role} value={role}>{role}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="interviewStyle">Interview Style</Label>
                        <Select value={formData.interviewStyle} onValueChange={(value) => handleInputChange('interviewStyle', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select style" />
                          </SelectTrigger>
                          <SelectContent>
                            {interviewStyles.map((style) => (
                              <SelectItem key={style} value={style}>{style}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="interviewerType">Interviewer Type</Label>
                      <Select value={formData.interviewerType} onValueChange={(value) => handleInputChange('interviewerType', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select interviewer" />
                        </SelectTrigger>
                        <SelectContent>
                          {interviewerTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Date & Time */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Schedule
                    </CardTitle>
                    <CardDescription>
                      When would you like to practice?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="scheduledDate">Date *</Label>
                        <Input
                          id="scheduledDate"
                          type="date"
                          value={formData.scheduledDate}
                          onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="scheduledTime">Time *</Label>
                        <Input
                          id="scheduledTime"
                          type="time"
                          value={formData.scheduledTime}
                          onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                        <Select value={formData.durationMinutes.toString()} onValueChange={(value) => handleInputChange('durationMinutes', parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Input
                          id="timezone"
                          value={formData.timezone}
                          onChange={(e) => handleInputChange('timezone', e.target.value)}
                          disabled
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Reminder Settings */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Reminders
                    </CardTitle>
                    <CardDescription>
                      Get notified before your interview
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <Label htmlFor="emailReminder">Email Reminder</Label>
                      </div>
                      <Switch
                        id="emailReminder"
                        checked={formData.emailReminder}
                        onCheckedChange={(checked) => handleInputChange('emailReminder', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4" />
                        <Label htmlFor="smsReminder">SMS Reminder</Label>
                      </div>
                      <Switch
                        id="smsReminder"
                        checked={formData.smsReminder}
                        onCheckedChange={(checked) => handleInputChange('smsReminder', checked)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reminderMinutes">Reminder Timing</Label>
                      <Select value={formData.reminderMinutes.toString()} onValueChange={(value) => handleInputChange('reminderMinutes', parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {reminderOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-4 space-y-3">
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Scheduling...' : 'Schedule Interview'}
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate('/interview-setup')}
                      >
                        Start Now Instead
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
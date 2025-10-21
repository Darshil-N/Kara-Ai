import { supabase } from './supabaseClient';

// Types for our database models
export interface Profile {
  id: string;
  username?: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Interview {
  id: string;
  interview_id: string;
  user_id: string;
  video_url?: string;
  video_timelines?: any;
  questions_and_answers?: any;
  analysis_score?: number;
  confidence_level?: number;
  communication_score?: number;
  interview_style?: string;
  target_role?: string;
  interviewer_type?: string;
  interview_date: string;
  status: string;
  timeline_data?: any;
  questions_answers?: any;
  created_at: string;
  updated_at: string;
}

export interface InterviewData {
  interview_id: string;
  target_role: string;
  interview_style: string;
  interviewer_type: string;
  video_url?: string;
  questions_and_answers?: Array<{
    question: string;
    answer: string;
    timestamp: number;
    duration: number;
  }>;
  video_timelines?: Array<{
    start_time: number;
    end_time: number;
    question_index: number;
  }>;
  analysis_score?: number;
  confidence_level?: number;
  communication_score?: number;
  status?: string;
}

export interface ScheduledInterview {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  target_role?: string;
  interview_style?: string;
  interviewer_type?: string;
  scheduled_date: string;
  duration_minutes: number;
  timezone: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'missed';
  reminder_sent: boolean;
  email_reminder: boolean;
  sms_reminder: boolean;
  reminder_minutes_before: number;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduledInterviewData {
  title: string;
  description?: string;
  target_role?: string;
  interview_style?: string;
  interviewer_type?: string;
  scheduled_date: string;
  duration_minutes?: number;
  timezone?: string;
  email_reminder?: boolean;
  sms_reminder?: boolean;
  reminder_minutes_before?: number;
  phone_number?: string;
}

export interface InterviewReminder {
  id: string;
  scheduled_interview_id: string;
  reminder_type: 'email' | 'sms' | 'push';
  scheduled_for: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
  recipient_contact: string;
  created_at: string;
}

// Profile service functions
export const profileService = {
  // Get current user profile
  async getCurrentProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  },

  // Create or update profile
  async upsertProfile(profileData: Partial<Profile>): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting profile:', error);
      throw error;
    }

    return data;
  },

  // Update profile
  async updateProfile(updates: Partial<Profile>): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }

    return data;
  }
};

// Interview service functions
export const interviewService = {
  // Create a new interview session
  async createInterview(interviewData: InterviewData): Promise<Interview | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('Creating interview with data:', {
      interview_id: interviewData.interview_id,
      user_id: user.id,
      user_id_type: typeof user.id,
      interviewData
    });

    const insertData = {
      interview_id: interviewData.interview_id,
      user_id: user.id,
      target_role: interviewData.target_role,
      interview_style: interviewData.interview_style,
      interviewer_type: interviewData.interviewer_type,
      video_url: interviewData.video_url,
      questions_and_answers: interviewData.questions_and_answers,
      video_timelines: interviewData.video_timelines,
      analysis_score: interviewData.analysis_score,
      confidence_level: interviewData.confidence_level,
      communication_score: interviewData.communication_score,
      status: interviewData.status || 'pending',
      timeline_data: interviewData.video_timelines, // Backup field
      questions_answers: interviewData.questions_and_answers // Backup field
    };

    console.log('Insert data:', insertData);

    const { data, error } = await supabase
      .from('interviews')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating interview:', error);
      console.error('Insert data that caused error:', insertData);
      throw error;
    }

    return data;
  },

  // Update an existing interview
  async updateInterview(interviewId: string, updates: Partial<InterviewData>): Promise<Interview | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('interviews')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        // Update backup fields as well
        ...(updates.video_timelines && { timeline_data: updates.video_timelines }),
        ...(updates.questions_and_answers && { questions_answers: updates.questions_and_answers })
      })
      .eq('interview_id', interviewId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating interview:', error);
      throw error;
    }

    return data;
  },

  // Get user's interviews
  async getUserInterviews(): Promise<Interview[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching interviews:', error);
      throw error;
    }

    return data || [];
  },

  // Get specific interview by interview_id
  async getInterview(interviewId: string): Promise<Interview | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('interview_id', interviewId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching interview:', error);
      return null;
    }

    return data;
  },

  // Complete an interview (update status and scores)
  async completeInterview(
    interviewId: string, 
    analysisData: {
      analysis_score?: number;
      confidence_level?: number;
      communication_score?: number;
      status?: string;
    }
  ): Promise<Interview | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('interviews')
      .update({
        ...analysisData,
        status: analysisData.status || 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('interview_id', interviewId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error completing interview:', error);
      throw error;
    }

    return data;
  }
};

// Scheduling service functions
export const schedulingService = {
  // Create a new scheduled interview
  async createScheduledInterview(scheduleData: CreateScheduledInterviewData): Promise<ScheduledInterview> {
    console.log('Creating scheduled interview:', scheduleData);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('scheduled_interviews')
      .insert({
        user_id: user.id,
        title: scheduleData.title,
        description: scheduleData.description,
        target_role: scheduleData.target_role,
        interview_style: scheduleData.interview_style,
        interviewer_type: scheduleData.interviewer_type,
        scheduled_date: scheduleData.scheduled_date,
        duration_minutes: scheduleData.duration_minutes || 30,
        timezone: scheduleData.timezone || 'UTC',
        email_reminder: scheduleData.email_reminder ?? true,
        sms_reminder: scheduleData.sms_reminder ?? true,
        reminder_minutes_before: scheduleData.reminder_minutes_before || 30,
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating scheduled interview:', error);
      throw error;
    }

    // Create reminder entries
    await this.createReminders(data.id, scheduleData.scheduled_date, {
      email: scheduleData.email_reminder ?? true,
      sms: scheduleData.sms_reminder ?? true,
      minutesBefore: scheduleData.reminder_minutes_before || 30
    });

    return data;
  },

  // Get all scheduled interviews for current user
  async getScheduledInterviews(): Promise<ScheduledInterview[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('scheduled_interviews')
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('Error fetching scheduled interviews:', error);
      throw error;
    }

    return data || [];
  },

  // Get upcoming scheduled interviews
  async getUpcomingInterviews(limit: number = 5): Promise<ScheduledInterview[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('scheduled_interviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'scheduled')
      .gte('scheduled_date', now)
      .order('scheduled_date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching upcoming interviews:', error);
      throw error;
    }

    return data || [];
  },

  // Update scheduled interview
  async updateScheduledInterview(id: string, updates: Partial<ScheduledInterview>): Promise<ScheduledInterview> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('scheduled_interviews')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating scheduled interview:', error);
      throw error;
    }

    return data;
  },

  // Cancel scheduled interview
  async cancelScheduledInterview(id: string): Promise<ScheduledInterview> {
    return this.updateScheduledInterview(id, { status: 'cancelled' });
  },

  // Mark interview as completed
  async completeScheduledInterview(id: string): Promise<ScheduledInterview> {
    return this.updateScheduledInterview(id, { status: 'completed' });
  },

  // Delete scheduled interview
  async deleteScheduledInterview(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('scheduled_interviews')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting scheduled interview:', error);
      throw error;
    }
  },

  // Create reminder entries
  async createReminders(scheduledInterviewId: string, scheduledDate: string, options: {
    email: boolean;
    sms: boolean;
    minutesBefore: number;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const scheduledDateTime = new Date(scheduledDate);
    const reminderTime = new Date(scheduledDateTime.getTime() - (options.minutesBefore * 60 * 1000));

    const reminders = [];

    if (options.email) {
      reminders.push({
        scheduled_interview_id: scheduledInterviewId,
        reminder_type: 'email',
        scheduled_for: reminderTime.toISOString(),
        recipient_contact: user.email!,
        status: 'pending'
      });
    }

    if (options.sms && user.phone) {
      reminders.push({
        scheduled_interview_id: scheduledInterviewId,
        reminder_type: 'sms',
        scheduled_for: reminderTime.toISOString(),
        recipient_contact: user.phone,
        status: 'pending'
      });
    }

    if (reminders.length > 0) {
      const { error } = await supabase
        .from('interview_reminders')
        .insert(reminders);

      if (error) {
        console.error('Error creating reminders:', error);
        throw error;
      }
    }
  },

  // Get pending reminders (for backend processing)
  async getPendingReminders(): Promise<InterviewReminder[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('interview_reminders')
      .select(`
        *,
        scheduled_interviews!inner(*)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now);

    if (error) {
      console.error('Error fetching pending reminders:', error);
      throw error;
    }

    return data || [];
  },

  // Mark reminder as sent
  async markReminderSent(reminderId: string): Promise<void> {
    const { error } = await supabase
      .from('interview_reminders')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', reminderId);

    if (error) {
      console.error('Error marking reminder as sent:', error);
      throw error;
    }
  }
};

// AI-Enhanced Interview Types
export interface InterviewQuestionAnswer {
  question: string;
  answer: string;
  transcript: string;
  timestamp: {
    start: number;
    end: number;
    duration: number;
  };
  analysis: {
    score: number;
    confidence: number;
    communication: number;
    content: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  };
  modelAnswer?: string;
}

export interface AIInterviewSession {
  interview_id: string;
  target_role: string;
  interview_style: string;
  interviewer_type: string;
  status: 'active' | 'completed' | 'cancelled';
  questions_answers: InterviewQuestionAnswer[];
  final_summary?: {
    overall_score: number;
    confidence_level: number;
    communication_score: number;
    content_score: number;
    summary: string;
    suggestions: string[];
    key_strengths: string[];
    areas_for_improvement: string[];
  };
}

// Enhanced Interview Service for AI functionality
export const enhancedInterviewService = {
  // Create AI interview session
  async createInterviewSession(data: {
    interview_id: string;
    target_role: string;
    interview_style: string;
    interviewer_type: string;
  }): Promise<AIInterviewSession | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const session: AIInterviewSession = {
      interview_id: data.interview_id,
      target_role: data.target_role,
      interview_style: data.interview_style,
      interviewer_type: data.interviewer_type,
      status: 'active',
      questions_answers: []
    };

    // Update the interview record with AI session data
    const { data: result, error } = await supabase
      .from('interviews')
      .update({
        target_role: data.target_role,
        interview_style: data.interview_style,
        interviewer_type: data.interviewer_type,
        status: 'active',
        questions_answers: [],
        updated_at: new Date().toISOString()
      })
      .eq('interview_id', data.interview_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error creating AI interview session:', error);
      return null;
    }

    return session;
  },

  // Add question-answer pair with analysis
  async addQuestionAnswer(
    interviewId: string, 
    qa: InterviewQuestionAnswer
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get current interview data
    const { data: interview, error: fetchError } = await supabase
      .from('interviews')
      .select('questions_answers, analysis_score, confidence_level, communication_score')
      .eq('interview_id', interviewId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching interview:', fetchError);
      return false;
    }

    // Add new Q&A to existing array
    const currentQAs = Array.isArray(interview.questions_answers) ? interview.questions_answers : [];
    const updatedQAs = [...currentQAs, qa];

    // Calculate running averages
    const scores = updatedQAs.map(q => q.analysis);
    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    const avgConfidence = scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length;
    const avgCommunication = scores.reduce((sum, s) => sum + s.communication, 0) / scores.length;

    // Update interview with new Q&A and running scores
    const { error: updateError } = await supabase
      .from('interviews')
      .update({
        questions_answers: updatedQAs,
        analysis_score: Math.round(avgScore),
        confidence_level: Math.round(avgConfidence),
        communication_score: Math.round(avgCommunication),
        updated_at: new Date().toISOString()
      })
      .eq('interview_id', interviewId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating interview with Q&A:', updateError);
      return false;
    }

    return true;
  },

  // Complete interview with final summary
  async completeInterview(
    interviewId: string,
    finalSummary: {
      overall_score: number;
      confidence_level: number;
      communication_score: number;
      content_score: number;
      summary: string;
      suggestions: string[];
      key_strengths: string[];
      areas_for_improvement: string[];
    }
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('interviews')
      .update({
        status: 'completed',
        analysis_score: finalSummary.overall_score,
        confidence_level: finalSummary.confidence_level,
        communication_score: finalSummary.communication_score,
        // Store final summary in timeline_data field as JSON
        timeline_data: {
          final_summary: finalSummary,
          completion_date: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('interview_id', interviewId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error completing interview:', error);
      return false;
    }

    return true;
  },

  // Get AI interview results for feedback page
  async getInterviewResults(interviewId: string): Promise<{
    interview: Interview | null;
    questionsAnswers: InterviewQuestionAnswer[];
    finalSummary: any;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: interview, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('interview_id', interviewId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching interview results:', error);
      return { interview: null, questionsAnswers: [], finalSummary: null };
    }

    const questionsAnswers = Array.isArray(interview.questions_answers) ? interview.questions_answers : [];
    const finalSummary = interview.timeline_data?.final_summary || null;

    return {
      interview,
      questionsAnswers,
      finalSummary
    };
  },

  // Get all completed interviews for user
  async getUserInterviews(): Promise<Interview[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user interviews:', error);
      return [];
    }

    return data || [];
  }
};

// Auth service functions
export const authService = {
  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Sign up with email and automatically create profile
  async signUp(email: string, password: string, metadata: { name?: string; username?: string }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.name,
          name: metadata.name,
          username: metadata.username
        }
      }
    });

    if (error) throw error;
    return data;
  },

  // Sign in
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
};
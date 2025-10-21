import React, { createContext, useContext, useState, useEffect } from 'react';
import { interviewService, InterviewData, Interview } from '@/lib/databaseService';

interface InterviewContextType {
  currentInterview: Interview | null;
  interviewSetupData: Partial<InterviewData> | null;
  setInterviewSetupData: (data: Partial<InterviewData>) => void;
  createNewInterview: (data: InterviewData) => Promise<Interview | null>;
  updateCurrentInterview: (updates: Partial<InterviewData>) => Promise<Interview | null>;
  completeInterview: (analysisData: {
    analysis_score?: number;
    confidence_level?: number;
    communication_score?: number;
    status?: string;
  }) => Promise<Interview | null>;
  userInterviews: Interview[];
  refreshUserInterviews: () => Promise<void>;
  resetInterviewContext: () => void;
}

const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

export const useInterview = () => {
  const context = useContext(InterviewContext);
  if (context === undefined) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  return context;
};

interface InterviewProviderProps {
  children: React.ReactNode;
}

export const InterviewProvider: React.FC<InterviewProviderProps> = ({ children }) => {
  const [currentInterview, setCurrentInterview] = useState<Interview | null>(null);
  const [interviewSetupData, setInterviewSetupData] = useState<Partial<InterviewData> | null>(null);
  const [userInterviews, setUserInterviews] = useState<Interview[]>([]);

  // Load user interviews on mount
  useEffect(() => {
    refreshUserInterviews();
  }, []);

  const createNewInterview = async (data: InterviewData): Promise<Interview | null> => {
    try {
      const interview = await interviewService.createInterview(data);
      if (interview) {
        setCurrentInterview(interview);
        await refreshUserInterviews();
      }
      return interview;
    } catch (error) {
      console.error('Error creating interview:', error);
      return null;
    }
  };

  const updateCurrentInterview = async (updates: Partial<InterviewData>): Promise<Interview | null> => {
    if (!currentInterview) return null;
    
    try {
      const updatedInterview = await interviewService.updateInterview(
        currentInterview.interview_id,
        updates
      );
      if (updatedInterview) {
        setCurrentInterview(updatedInterview);
        await refreshUserInterviews();
      }
      return updatedInterview;
    } catch (error) {
      console.error('Error updating interview:', error);
      return null;
    }
  };

  const completeInterview = async (analysisData: {
    analysis_score?: number;
    confidence_level?: number;
    communication_score?: number;
    status?: string;
  }): Promise<Interview | null> => {
    if (!currentInterview) return null;

    try {
      const completedInterview = await interviewService.completeInterview(
        currentInterview.interview_id,
        analysisData
      );
      if (completedInterview) {
        setCurrentInterview(completedInterview);
        await refreshUserInterviews();
      }
      return completedInterview;
    } catch (error) {
      console.error('Error completing interview:', error);
      return null;
    }
  };

  const refreshUserInterviews = async (): Promise<void> => {
    try {
      const interviews = await interviewService.getUserInterviews();
      setUserInterviews(interviews);
    } catch (error) {
      console.error('Error refreshing user interviews:', error);
    }
  };

  const resetInterviewContext = () => {
    setCurrentInterview(null);
    setInterviewSetupData(null);
  };

  const value: InterviewContextType = {
    currentInterview,
    interviewSetupData,
    setInterviewSetupData,
    createNewInterview,
    updateCurrentInterview,
    completeInterview,
    userInterviews,
    refreshUserInterviews,
    resetInterviewContext,
  };

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
};
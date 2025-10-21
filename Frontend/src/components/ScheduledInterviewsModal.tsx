import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, ArrowLeft, Eye, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { schedulingService, ScheduledInterview } from '@/lib/databaseService';

interface ScheduledInterviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleNew: () => void;
}

export const ScheduledInterviewsModal: React.FC<ScheduledInterviewsModalProps> = ({ 
  isOpen, 
  onClose, 
  onScheduleNew 
}) => {
  const [interviews, setInterviews] = useState<ScheduledInterview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadInterviews();
    }
  }, [isOpen]);

  const loadInterviews = async () => {
    try {
      setIsLoading(true);
      const data = await schedulingService.getScheduledInterviews();
      setInterviews(data);
    } catch (error) {
      console.error('Error loading scheduled interviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInterview = async (id: string) => {
    try {
      await schedulingService.deleteScheduledInterview(id);
      setInterviews(prev => prev.filter(interview => interview.id !== id));
    } catch (error) {
      console.error('Error deleting interview:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { variant: 'default' as const, text: 'Scheduled' },
      completed: { variant: 'secondary' as const, text: 'Completed' },
      cancelled: { variant: 'destructive' as const, text: 'Cancelled' },
      missed: { variant: 'outline' as const, text: 'Missed' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const upcomingInterviews = interviews.filter(interview => {
    const interviewDate = new Date(interview.scheduled_date);
    const now = new Date();
    return interviewDate > now && interview.status === 'scheduled';
  });

  const pastInterviews = interviews.filter(interview => {
    const interviewDate = new Date(interview.scheduled_date);
    const now = new Date();
    return interviewDate <= now || interview.status !== 'scheduled';
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Scheduled Interviews
              </DialogTitle>
              <DialogDescription>
                View and manage your upcoming and past practice interviews.
              </DialogDescription>
            </div>
            <Button onClick={onScheduleNew} size="sm">
              Schedule New
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading interviews...</div>
            </div>
          ) : interviews.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No interviews scheduled</h3>
              <p className="text-gray-500 mb-4">
                Get started by scheduling your first practice interview.
              </p>
              <Button onClick={onScheduleNew}>
                Schedule Interview
              </Button>
            </div>
          ) : (
            <>
              {/* Upcoming Interviews */}
              {upcomingInterviews.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Upcoming Interviews ({upcomingInterviews.length})
                  </h3>
                  <div className="space-y-3">
                    {upcomingInterviews.map((interview) => (
                      <Card key={interview.id} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">{interview.title}</CardTitle>
                              <CardDescription className="flex items-center gap-4 mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(interview.scheduled_date)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {formatTime(interview.scheduled_date)}
                                </span>
                                <span>{interview.duration_minutes} min</span>
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(interview.status)}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteInterview(interview.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                            <Badge variant="outline">{interview.interviewer_type || 'General'}</Badge>
                            {interview.target_role && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {interview.target_role}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Past Interviews */}
              {pastInterviews.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Past Interviews ({pastInterviews.length})
                  </h3>
                  <div className="space-y-3">
                    {pastInterviews.map((interview) => (
                      <Card key={interview.id} className="opacity-75">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">{interview.title}</CardTitle>
                              <CardDescription className="flex items-center gap-4 mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(interview.scheduled_date)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {formatTime(interview.scheduled_date)}
                                </span>
                                <span>{interview.duration_minutes} min</span>
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(interview.status)}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteInterview(interview.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                            <Badge variant="outline">{interview.interviewer_type || 'General'}</Badge>
                            {interview.target_role && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {interview.target_role}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
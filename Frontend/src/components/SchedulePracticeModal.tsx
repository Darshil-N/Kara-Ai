import React, { useState } from 'react';
import { Calendar, Clock, User, Mail, MessageSquare, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { schedulingService } from '@/lib/databaseService';

interface SchedulePracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SchedulePracticeModal: React.FC<SchedulePracticeModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    interviewer_type: '',
    target_role: '',
    scheduled_date: '',
    duration_minutes: 60,
    email_reminder: true,
    sms_reminder: true,
    reminder_minutes_before: 30,
    phone_number: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await schedulingService.createScheduledInterview(formData);
      
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        onSuccess?.();
        // Reset form
        setFormData({
          title: '',
          interviewer_type: '',
          target_role: '',
          scheduled_date: '',
          duration_minutes: 60,
          email_reminder: true,
          sms_reminder: true,
          reminder_minutes_before: 30,
          phone_number: ''
        });
      }, 2000);
    } catch (error) {
      console.error('Error scheduling interview:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Interview Scheduled!</h3>
            <p className="text-gray-600 mb-4">
              Your practice interview has been scheduled successfully. You'll receive reminders before the session.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Practice Interview
          </DialogTitle>
          <DialogDescription>
            Schedule a practice interview session and get automated reminders.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Interview Title</Label>
            <Input
              id="title"
              placeholder="e.g., Frontend Developer Interview"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interviewer_type">Type</Label>
              <Select value={formData.interviewer_type} onValueChange={(value) => handleInputChange('interviewer_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="behavioral">Behavioral</SelectItem>
                  <SelectItem value="case_study">Case Study</SelectItem>
                  <SelectItem value="system_design">System Design</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_role">Target Role (Optional)</Label>
              <Input
                id="target_role"
                placeholder="e.g., Frontend Developer"
                value={formData.target_role}
                onChange={(e) => handleInputChange('target_role', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Date & Time</Label>
              <Input
                id="scheduled_date"
                type="datetime-local"
                value={formData.scheduled_date}
                onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select value={formData.duration_minutes.toString()} onValueChange={(value) => handleInputChange('duration_minutes', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Reminder Settings
            </h4>

            <div className="space-y-2">
              <Label htmlFor="reminder_minutes">Remind me before</Label>
              <Select value={formData.reminder_minutes_before.toString()} onValueChange={(value) => handleInputChange('reminder_minutes_before', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="1440">1 day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email_reminder"
                  checked={formData.email_reminder}
                  onCheckedChange={(checked) => handleInputChange('email_reminder', checked)}
                />
                <Label htmlFor="email_reminder" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email reminder
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sms_reminder"
                  checked={formData.sms_reminder}
                  onCheckedChange={(checked) => handleInputChange('sms_reminder', checked)}
                />
                <Label htmlFor="sms_reminder" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  SMS reminder
                </Label>
              </div>

              {formData.sms_reminder && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    placeholder="+1234567890"
                    value={formData.phone_number}
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                    required={formData.sms_reminder}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Interview'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
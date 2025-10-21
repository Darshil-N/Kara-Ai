import { useState } from 'react';
import { ArrowRight, ArrowLeft, Users, Briefcase, Clock, Star, Camera, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { useInterview } from '@/lib/InterviewContext';

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

const aiPersonas = [
  {
    id: 'friendly-hr',
    name: 'Friendly HR',
    description: 'Warm, encouraging interviewer focused on cultural fit',
    isPremium: false,
    icon: Users
  },
  {
    id: 'tech-lead',
    name: 'Technical Lead',
    description: 'Experienced engineer asking in-depth technical questions',
    isPremium: false,
    icon: Briefcase
  },
  {
    id: 'strict-manager',
    name: 'Strict Manager',
    description: 'Direct, challenging interviewer with high standards',
    isPremium: true,
    icon: Clock
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'C-level executive focusing on strategic thinking',
    isPremium: true,
    icon: Star
  }
];

export default function InterviewSetup() {
  const navigate = useNavigate();
  const { setInterviewSetupData, createNewInterview } = useInterview();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    targetRole: '',
    interviewStyle: '',
    selectedPersona: ''
  });
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const [isCreatingInterview, setIsCreatingInterview] = useState(false);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handlePermissionRequest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setCameraPermission(true);
      setMicPermission(true);
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      setCameraPermission(false);
      setMicPermission(false);
    }
  };

  const handleStartInterview = async () => {
    if (!canProceed()) return;

    setIsCreatingInterview(true);

    try {
      // Get the selected persona details
      const selectedPersona = aiPersonas.find(p => p.id === formData.selectedPersona);
      
      // Create interview data object
      const interviewData = {
        interview_id: `interview_${Date.now()}`,
        target_role: formData.targetRole,
        interview_style: formData.interviewStyle,
        interviewer_type: selectedPersona?.name || 'Unknown',
        status: 'in_progress'
      };

      console.log('About to create interview with data:', interviewData);

      // Store setup data in context
      setInterviewSetupData(interviewData);

      // Create interview record in database
      const interview = await createNewInterview(interviewData);
      
      if (interview) {
        console.log('Interview created successfully:', interview);
        // Navigate to live interview
        navigate('/interview-live');
      } else {
        console.error('createNewInterview returned null');
        alert('Failed to create interview session. Please try again.');
      }
    } catch (error) {
      console.error('Error starting interview:', error);
      alert(`An error occurred while starting the interview: ${error.message || 'Unknown error'}`);
    } finally {
      setIsCreatingInterview(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return formData.targetRole && formData.interviewStyle;
    if (step === 2) return formData.selectedPersona;
    if (step === 3) return cameraPermission && micPermission;
    return false;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4 mb-4">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${step >= num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                  `}>
                    {num}
                  </div>
                  {num < 3 && (
                    <div className={`w-16 h-0.5 mx-2 ${
                      step > num ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Step {step} of 3
            </div>
          </div>

          {/* Step Content */}
          <Card className="premium-card">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl mb-2">
                {step === 1 && "Interview Configuration"}
                {step === 2 && "Choose Your AI Interviewer"}
                {step === 3 && "Technical Setup"}
              </CardTitle>
              <CardDescription className="text-lg">
                {step === 1 && "Configure your interview type and role"}
                {step === 2 && "Select the interviewer personality that matches your target company"}
                {step === 3 && "Ensure your camera and microphone are working properly"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-8">
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-3 block">Target Role</label>
                    <Select value={formData.targetRole} onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, targetRole: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the role you're interviewing for" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetRoles.map((role) => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-3 block">Interview Style</label>
                    <Select value={formData.interviewStyle} onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, interviewStyle: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose the type of interview" />
                      </SelectTrigger>
                      <SelectContent>
                        {interviewStyles.map((style) => (
                          <SelectItem key={style} value={style}>{style}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiPersonas.map((persona) => (
                    <Card 
                      key={persona.id}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        formData.selectedPersona === persona.id 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : ''
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, selectedPersona: persona.id }))}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <persona.icon className="h-8 w-8 text-primary" />
                          {persona.isPremium && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold mb-2">{persona.name}</h3>
                        <p className="text-sm text-muted-foreground">{persona.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-64 h-48 mx-auto bg-muted rounded-lg flex items-center justify-center mb-6">
                      {cameraPermission ? (
                        <div className="text-green-500">
                          <Camera className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Camera Ready</p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          <Camera className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Camera Preview</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center space-x-6 mb-6">
                      <div className="flex items-center space-x-2">
                        <Camera className={`h-5 w-5 ${cameraPermission ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <span className="text-sm">Camera</span>
                        {cameraPermission === true && <Badge variant="secondary" className="text-xs">Ready</Badge>}
                        {cameraPermission === false && <Badge variant="destructive" className="text-xs">Blocked</Badge>}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mic className={`h-5 w-5 ${micPermission ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <span className="text-sm">Microphone</span>
                        {micPermission === true && <Badge variant="secondary" className="text-xs">Ready</Badge>}
                        {micPermission === false && <Badge variant="destructive" className="text-xs">Blocked</Badge>}
                      </div>
                    </div>

                    {(!cameraPermission || !micPermission) && (
                      <Button onClick={handlePermissionRequest} className="mb-4">
                        Grant Camera & Microphone Access
                      </Button>
                    )}

                    {cameraPermission === false || micPermission === false && (
                      <p className="text-sm text-muted-foreground">
                        Please allow camera and microphone access to continue with your interview.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>

            {/* Navigation Buttons */}
            <div className="px-6 pb-6">
              <div className="flex justify-between">
                <div>
                  {step > 1 && (
                    <Button variant="outline" onClick={handleBack}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  )}
                  {step === 1 && (
                    <Link to="/dashboard">
                      <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                      </Button>
                    </Link>
                  )}
                </div>
                
                <div>
                  {step < 3 ? (
                    <Button onClick={handleNext} disabled={!canProceed()}>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleStartInterview} 
                      disabled={!canProceed() || isCreatingInterview} 
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isCreatingInterview ? 'Creating Session...' : 'Start Interview'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
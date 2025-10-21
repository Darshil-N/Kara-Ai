import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Download, Play, Pause, RotateCcw, BarChart3, Clock, Lightbulb, Brain, Mic, Volume2, VolumeX, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { useInterview } from '@/lib/InterviewContext';
import { enhancedInterviewService } from '@/lib/databaseService';
import type { InterviewQuestionAnswer, Interview } from '@/lib/databaseService';

const mockTimelineEvents = [
  { timestamp: '0:15', type: 'positive', event: 'Strong opening statement', score: 85 },
  { timestamp: '1:23', type: 'neutral', event: 'Asked clarifying question', score: 75 },
  { timestamp: '2:45', type: 'negative', event: 'Excessive filler words', score: 60 },
  { timestamp: '3:12', type: 'positive', event: 'Excellent example provided', score: 90 },
  { timestamp: '4:30', type: 'positive', event: 'Confident body language', score: 88 },
];

const mockQuestions = [
  {
    question: "Tell me about yourself and why you're interested in this role.",
    userAnswer: "I'm a software engineer with 3 years of experience...",
    modelAnswer: "I'm a passionate software engineer with extensive experience in full-stack development, particularly in React and Node.js. What draws me to this role is the opportunity to work on scalable systems that impact millions of users, which aligns perfectly with my career goal of building meaningful technology solutions."
  },
  {
    question: "What is your greatest strength and how does it apply to this position?",
    userAnswer: "My greatest strength is problem-solving...",
    modelAnswer: "My greatest strength is my analytical problem-solving approach combined with strong communication skills. In my previous role, I consistently broke down complex technical challenges into manageable components, which not only helped me find efficient solutions but also enabled me to explain technical concepts clearly to both technical and non-technical stakeholders."
  }
];

export default function FeedbackDashboard() {
  const { currentInterview } = useInterview();
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // AI Interview state
  const [isAIInterview, setIsAIInterview] = useState(false);
  const [aiInterviewData, setAiInterviewData] = useState<Interview | null>(null);
  const [aiQuestionsAnswers, setAiQuestionsAnswers] = useState<InterviewQuestionAnswer[]>([]);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load AI interview data when component mounts
  useEffect(() => {
    const loadInterviewData = async () => {
      if (!currentInterview?.interview_id) {
        setLoading(false);
        return;
      }

      try {
        const results = await enhancedInterviewService.getInterviewResults(currentInterview.interview_id);
        
        if (results.interview && results.questionsAnswers.length > 0) {
          setIsAIInterview(true);
          setAiInterviewData(results.interview);
          setAiQuestionsAnswers(results.questionsAnswers);
          setAiSummary(results.finalSummary);
        } else {
          setIsAIInterview(false);
        }
      } catch (error) {
        console.error('Error loading interview data:', error);
        setIsAIInterview(false);
      } finally {
        setLoading(false);
      }
    };

    loadInterviewData();
  }, [currentInterview]);

  // Initialize video when interview data loads
  useEffect(() => {
    if (aiInterviewData?.video_url && videoRef.current) {
      // Reset video error state when loading new video
      setVideoError(null);
      setVideoLoading(true);
      
      // Set initial volume and muted state
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    } else if (!aiInterviewData?.video_url) {
      // Reset video states when no video URL
      setVideoLoading(false);
      setVideoError(null);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
    }
  }, [aiInterviewData?.video_url, volume, isMuted]);

  const handleTimelineClick = (timestamp: string) => {
    const [min, sec] = timestamp.split(':').map(Number);
    const totalSeconds = min * 60 + sec;
    setCurrentTime(totalSeconds);
    if (videoRef.current) {
      videoRef.current.currentTime = totalSeconds;
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setVideoLoading(false);
    }
  };

  const handleVideoLoadStart = () => {
    setVideoLoading(true);
    setVideoError(null);
  };

  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const clickTime = (clickX / width) * duration;
      
      videoRef.current.currentTime = clickTime;
      setCurrentTime(clickTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleVideoError = () => {
    setVideoError('Failed to load video. Please check the video URL or try again later.');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (!aiInterviewData?.video_url || videoError) return;
    
    switch (e.key) {
      case ' ':
        e.preventDefault();
        handlePlayPause();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, currentTime - 10);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(duration, currentTime + 10);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        const newVolumeUp = Math.min(1, volume + 0.1);
        setVolume(newVolumeUp);
        if (videoRef.current) {
          videoRef.current.volume = newVolumeUp;
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        const newVolumeDown = Math.max(0, volume - 0.1);
        setVolume(newVolumeDown);
        if (videoRef.current) {
          videoRef.current.volume = newVolumeDown;
        }
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        toggleMute();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Link to="/dashboard">
                <Button variant="outline" className="mb-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-4xl font-bold mb-2">Interview Analysis</h1>
              <p className="text-muted-foreground">
                Software Engineer Interview • Completed on Dec 13, 2024
              </p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button>
                <RotateCcw className="mr-2 h-4 w-4" />
                Practice Again
              </Button>
            </div>
          </div>

          <div className="text-center p-8 bg-muted/20 rounded-lg mb-8">
            <p className="text-muted-foreground">
              [BACKEND INTEGRATION REQUIRED: Fetch all analysis data for this session from /api/interview/session_id/results and populate all modules on this page.]
            </p>
          </div>

          {/* Main Content - Two Pane Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Pane - Video Player */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="premium-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Interview Recording</CardTitle>
                    <Badge variant="secondary">
                      {duration > 0 ? formatTime(duration) : '--:--'} duration
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div 
                    className="aspect-video bg-muted rounded-lg mb-4 relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" 
                    tabIndex={aiInterviewData?.video_url ? 0 : -1}
                    onKeyDown={handleKeyPress}
                  >
                    {aiInterviewData?.video_url ? (
                      <>
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover rounded-lg"
                          onTimeUpdate={handleVideoTimeUpdate}
                          onLoadedMetadata={handleVideoLoadedMetadata}
                          onLoadStart={handleVideoLoadStart}
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                          onError={handleVideoError}
                          preload="metadata"
                          crossOrigin="anonymous"
                        >
                          <source src={aiInterviewData.video_url} type="video/mp4" />
                          <source src={aiInterviewData.video_url} type="video/webm" />
                          Your browser does not support the video tag.
                        </video>
                        {videoLoading && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <div className="text-center text-white">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                              <p className="text-sm">Loading video...</p>
                            </div>
                          </div>
                        )}
                        {videoError && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="text-center text-white p-4">
                              <p className="mb-2">⚠️ Video Error</p>
                              <p className="text-sm">{videoError}</p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                        <div>
                          <Play className="h-12 w-12 mx-auto mb-2" />
                          <p>No video available</p>
                          <p className="text-xs mt-1">Video recording not found</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {/* Main Controls */}
                    <div className="flex items-center space-x-4">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={handlePlayPause}
                        disabled={!aiInterviewData?.video_url || !!videoError}
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <div className="flex-1 cursor-pointer" onClick={handleSeek}>
                        <Progress 
                          value={duration > 0 ? (currentTime / duration) * 100 : 0} 
                          className="w-full" 
                        />
                      </div>
                      <span className="text-sm text-muted-foreground min-w-[100px]">
                        {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : '--:--'}
                      </span>
                    </div>
                    
                    {/* Additional Controls */}
                    {aiInterviewData?.video_url && !videoError && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleMute}
                          >
                            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          </Button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                          />
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleFullscreen}
                          title="Fullscreen"
                        >
                          <Maximize className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {!aiInterviewData?.video_url ? (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Note:</strong> Video recording is not available for this interview session.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Keyboard Shortcuts:</strong> Space (play/pause), ← → (seek 10s), ↑ ↓ (volume), M (mute), F (fullscreen)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Pane - Analysis Tabs */}
            <div className="space-y-6">
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="answers">Answers</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4 mt-6">
                  {loading ? (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p>Loading interview results...</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="premium-card">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          {isAIInterview ? (
                            <>
                              <Brain className="mr-2 h-5 w-5 text-purple-600" />
                              AI Interview Analysis
                            </>
                          ) : (
                            <>
                              <BarChart3 className="mr-2 h-5 w-5" />
                              Overall Score
                            </>
                          )}
                        </CardTitle>
                        {isAIInterview && (
                          <CardDescription>
                            Powered by Gemini 2.5 Flash • {aiQuestionsAnswers.length} questions analyzed
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="text-center mb-6">
                          <div className="text-4xl font-bold text-primary mb-2">
                            {isAIInterview 
                              ? (aiInterviewData?.analysis_score || aiSummary?.overallScore || 0)
                              : 82}/100
                          </div>
                          <Badge variant="secondary" className="text-sm">
                            {isAIInterview 
                              ? ((aiInterviewData?.analysis_score || aiSummary?.overallScore || 0) >= 80 ? 'Excellent' :
                                 (aiInterviewData?.analysis_score || aiSummary?.overallScore || 0) >= 70 ? 'Good' :
                                 (aiInterviewData?.analysis_score || aiSummary?.overallScore || 0) >= 60 ? 'Average' : 'Needs Improvement')
                              : 'Great Performance'}
                          </Badge>
                        </div>
                      
                        <div className="space-y-4">
                          {isAIInterview ? (
                            <>
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>Content Quality</span>
                                  <span>{aiSummary?.contentScore || aiInterviewData?.analysis_score || 0}%</span>
                                </div>
                                <Progress value={aiSummary?.contentScore || aiInterviewData?.analysis_score || 0} />
                              </div>
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>Communication</span>
                                  <span>{aiSummary?.communicationScore || aiInterviewData?.communication_score || 0}%</span>
                                </div>
                                <Progress value={aiSummary?.communicationScore || aiInterviewData?.communication_score || 0} />
                              </div>
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>Confidence</span>
                                  <span>{aiSummary?.confidenceLevel || aiInterviewData?.confidence_level || 0}%</span>
                                </div>
                                <Progress value={aiSummary?.confidenceLevel || aiInterviewData?.confidence_level || 0} />
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>Content Quality</span>
                                  <span>85%</span>
                                </div>
                                <Progress value={85} />
                              </div>
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>Communication</span>
                                  <span>78%</span>
                                </div>
                                <Progress value={78} />
                              </div>
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>Confidence</span>
                                  <span>83%</span>
                                </div>
                                <Progress value={83} />
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {!loading && (
                    <Card className="premium-card">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Lightbulb className="mr-2 h-5 w-5" />
                          {isAIInterview ? 'AI Insights & Recommendations' : 'Key Insights'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {isAIInterview && aiSummary ? (
                          <>
                            {/* AI Summary */}
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <p className="text-sm font-medium mb-1">Overall Assessment</p>
                              <p className="text-sm text-blue-800 dark:text-blue-200">{aiSummary.summary}</p>
                            </div>

                            {/* Strengths */}
                            {aiSummary.keyStrengths?.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2 text-green-700 dark:text-green-300">Key Strengths</p>
                                {aiSummary.keyStrengths.map((strength, index) => (
                                  <div key={index} className="flex items-start space-x-3 mb-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                                    <div className="text-sm">
                                      <p>{strength}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Areas for Improvement */}
                            {aiSummary.areasForImprovement?.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2 text-amber-700 dark:text-amber-300">Areas for Improvement</p>
                                {aiSummary.areasForImprovement.map((area, index) => (
                                  <div key={index} className="flex items-start space-x-3 mb-2">
                                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                                    <div className="text-sm">
                                      <p>{area}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Suggestions */}
                            {aiSummary.suggestions?.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2 text-purple-700 dark:text-purple-300">Suggestions</p>
                                {aiSummary.suggestions.map((suggestion, index) => (
                                  <div key={index} className="flex items-start space-x-3 mb-2">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                                    <div className="text-sm">
                                      <p>{suggestion}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                              <div className="text-sm">
                                <p className="font-medium">Strong Technical Knowledge</p>
                                <p className="text-muted-foreground">Demonstrated deep understanding of core concepts</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                              <div className="text-sm">
                                <p className="font-medium">Reduce Filler Words</p>
                                <p className="text-muted-foreground">Used "um" and "ah" 23 times during the session</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                              <div className="text-sm">
                                <p className="font-medium">Excellent Examples</p>
                                <p className="text-muted-foreground">Provided concrete, relevant examples for each answer</p>
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="timeline" className="mt-6">
                  <Card className="premium-card">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Clock className="mr-2 h-5 w-5" />
                        Interview Timeline
                      </CardTitle>
                      <CardDescription>Click on events to jump to that moment</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {mockTimelineEvents.map((event, index) => (
                          <div 
                            key={index}
                            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => handleTimelineClick(event.timestamp)}
                          >
                            <div className={`w-3 h-3 rounded-full ${
                              event.type === 'positive' ? 'bg-green-500' :
                              event.type === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium">{event.event}</p>
                                  <p className="text-xs text-muted-foreground">{event.timestamp}</p>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {event.score}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="answers" className="mt-6">
                  <div className="space-y-4">
                    {isAIInterview && aiQuestionsAnswers.length > 0 ? (
                      aiQuestionsAnswers.map((qa, index) => (
                        <Card key={index} className="premium-card">
                          <CardHeader>
                            <CardTitle className="text-base flex items-center justify-between">
                              Question {index + 1}
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  Score: {qa.analysis?.score || 0}/100
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  <Mic className="w-3 h-3 mr-1" />
                                  AI Analyzed
                                </Badge>
                              </div>
                            </CardTitle>
                            <CardDescription className="text-sm italic">
                              "{qa.question}"
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* AI Analysis */}
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-3 rounded-lg">
                              <h4 className="text-sm font-medium mb-2 flex items-center">
                                <Brain className="w-4 h-4 mr-1 text-purple-600" />
                                AI Analysis
                              </h4>
                              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">{qa.analysis?.feedback}</p>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="text-center">
                                  <p className="font-medium">Content</p>
                                  <p>{qa.analysis?.content || 0}/100</p>
                                </div>
                                <div className="text-center">
                                  <p className="font-medium">Communication</p>
                                  <p>{qa.analysis?.communication || 0}/100</p>
                                </div>
                                <div className="text-center">
                                  <p className="font-medium">Confidence</p>
                                  <p>{qa.analysis?.confidence || 0}/100</p>
                                </div>
                              </div>
                            </div>

                            {/* Your Answer with Transcript */}
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center">
                                Your Answer
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {Math.round(qa.timestamp.duration / 1000)}s
                                </Badge>
                              </h4>
                              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                                {qa.transcript || qa.answer}
                              </p>
                              
                              {/* Strengths & Improvements */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                {qa.analysis?.strengths && qa.analysis.strengths.length > 0 && (
                                  <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                    <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Strengths</p>
                                    {qa.analysis.strengths.map((strength, i) => (
                                      <p key={i} className="text-xs text-green-600 dark:text-green-400">• {strength}</p>
                                    ))}
                                  </div>
                                )}
                                
                                {qa.analysis?.improvements && qa.analysis.improvements.length > 0 && (
                                  <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">Improvements</p>
                                    {qa.analysis.improvements.map((improvement, i) => (
                                      <p key={i} className="text-xs text-amber-600 dark:text-amber-400">• {improvement}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Model Answer */}
                            {qa.modelAnswer && (
                              <div>
                                <h4 className="text-sm font-medium mb-2 flex items-center">
                                  Model Answer
                                  <Badge variant="secondary" className="ml-2 text-xs">AI Generated</Badge>
                                </h4>
                                <p className="text-sm text-muted-foreground bg-primary/5 border border-primary/10 p-3 rounded">
                                  {qa.modelAnswer}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      // Traditional interview fallback
                      mockQuestions.map((q, index) => (
                        <Card key={index} className="premium-card">
                          <CardHeader>
                            <CardTitle className="text-base">Question {index + 1}</CardTitle>
                            <CardDescription className="text-sm italic">
                              "{q.question}"
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">Your Answer</h4>
                              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                                {q.userAnswer}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center">
                                Model Answer
                                <Badge variant="secondary" className="ml-2 text-xs">AI Generated</Badge>
                              </h4>
                              <p className="text-sm text-muted-foreground bg-primary/5 border border-primary/10 p-3 rounded">
                                {q.modelAnswer}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
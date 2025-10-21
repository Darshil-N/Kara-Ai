import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Calendar,
  Download,
  Eye,
  Play,
  Star,
  TrendingUp,
  User,
  Settings,
  BarChart3
} from 'lucide-react';
import { useInterview } from '@/lib/InterviewContext';
import { profileService } from '@/lib/databaseService';
import { useNavigate } from 'react-router-dom';
import { SchedulePracticeModal } from '@/components/SchedulePracticeModal';
import { ScheduledInterviewsModal } from '@/components/ScheduledInterviewsModal';

// Mock data for performance chart
const performanceData = [
  { session: 1, clarity: 65, confidence: 60, content: 70 },
  { session: 2, clarity: 72, confidence: 68, content: 75 },
  { session: 3, clarity: 78, confidence: 75, content: 82 },
  { session: 4, clarity: 85, confidence: 80, content: 88 },
  { session: 5, clarity: 88, confidence: 85, content: 90 }
];

// Mock interview history
const interviewHistory = [
  {
    id: 1,
    date: '2024-01-15',
    role: 'Software Engineer',
    company: 'Google',
    score: 88,
    duration: '45 min'
  },
  {
    id: 2,
    date: '2024-01-12',
    role: 'Product Manager',
    company: 'Meta',
    score: 82,
    duration: '38 min'
  },
  {
    id: 3,
    date: '2024-01-10',
    role: 'Data Scientist',
    company: 'Netflix',
    score: 76,
    duration: '42 min'
  },
  {
    id: 4,
    date: '2024-01-08',
    role: 'Frontend Developer',
    company: 'Airbnb',
    score: 85,
    duration: '40 min'
  }
];

export default function Dashboard() {
  const [selectedMetric, setSelectedMetric] = useState<'clarity' | 'confidence' | 'content'>('clarity');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [interviewsModalOpen, setInterviewsModalOpen] = useState(false);
  const { userInterviews, refreshUserInterviews } = useInterview();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const profile = await profileService.getCurrentProfile();
        setUserProfile(profile);
        await refreshUserInterviews();
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [refreshUserInterviews]);

  // Transform user interviews into chart data
  const performanceData = userInterviews
    .filter(interview => interview.status === 'completed')
    .map((interview, index) => ({
      session: index + 1,
      clarity: interview.communication_score || 0,
      confidence: interview.confidence_level || 0,
      content: interview.analysis_score || 0
    }));

  // Use actual interview history or fallback to mock data
  const interviewHistory = userInterviews.length > 0 
    ? userInterviews.map(interview => ({
        id: interview.id,
        date: new Date(interview.interview_date).toLocaleDateString(),
        role: interview.target_role || 'Unknown Role',
        company: 'Practice Session',
        score: interview.analysis_score || 0,
        duration: '45 min' // Could be calculated from video_timelines if available
      }))
    : [
        // Fallback mock data when no interviews exist
        {
          id: 'mock-1',
          date: '2024-01-15',
          role: 'Software Engineer',
          company: 'Practice Session',
          score: 88,
          duration: '45 min'
        }
      ];

  const mockUser = userProfile || {
    name: 'User',
    email: 'user@example.com',
    avatar: '/api/placeholder/40/40'
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 85) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  // Quick Action handlers
  const handleSettings = () => {
    navigate('/settings');
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  const handleSchedulePractice = () => {
    setScheduleModalOpen(true);
  };

  const handleViewScheduledInterviews = () => {
    setInterviewsModalOpen(true);
  };

  const handleUpgradePlan = () => {
    // Navigate to pricing page
    navigate('/pricing');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Welcome back, {userProfile?.full_name || userProfile?.username || 'User'}! 👋
              </h1>
              <p className="text-xl text-muted-foreground">
                Track your progress and continue improving your interview skills
              </p>
            </div>
            <div className="flex space-x-4 mt-6 lg:mt-0">
              <a href="/interview-setup">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  <Play className="w-5 h-5 mr-2" />
                  Start New Session
                </Button>
              </a>
              <Button variant="outline" size="lg">
                <Star className="w-5 h-5 mr-2" />
                Upgrade to Premium
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Performance Overview */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="premium-card border-0 shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">24</div>
                    <p className="text-xs text-muted-foreground">
                      +3 from last week
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="premium-card border-0 shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">85%</div>
                    <p className="text-xs text-muted-foreground">
                      +12% from last month
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="premium-card border-0 shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Improvement Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">23%</div>
                    <p className="text-xs text-muted-foreground">
                      Consistent growth
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Chart */}
              <Card className="premium-card border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Performance Progression</CardTitle>
                  <CardDescription>
                    Your improvement over the last 5 sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4 mb-6">
                    {(['clarity', 'confidence', 'content'] as const).map((metric) => (
                      <Button
                        key={metric}
                        variant={selectedMetric === metric ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedMetric(metric)}
                        className="capitalize"
                      >
                        {metric}
                      </Button>
                    ))}
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="session" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey={selectedMetric}
                          stroke="hsl(var(--primary))" 
                          strokeWidth={3}
                          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                          activeDot={{ r: 8, fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Recent Achievement */}
              <Card className="premium-card border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span>Recent Achievement</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Confidence Boost!</p>
                        <p className="text-sm text-muted-foreground">
                          Improved confidence by 15%
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="premium-card border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" onClick={handleSettings}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={handleProfile}>
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={handleSchedulePractice}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Practice
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={handleViewScheduledInterviews}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Scheduled Interviews
                  </Button>
                </CardContent>
              </Card>

              {/* Current Plan */}
              <Card className="premium-card border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Free Plan</span>
                        <span className="text-sm text-muted-foreground">1/3 sessions</span>
                      </div>
                      <Progress value={33} className="h-2" />
                    </div>
                    <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleUpgradePlan}>
                      <Star className="w-4 h-4 mr-2" />
                      Upgrade to Premium
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Interview History */}
          <div className="mt-12">
            <Card className="premium-card border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Interview History</CardTitle>
                <CardDescription>
                  Review your past sessions and track improvement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {interviewHistory.map((interview) => (
                    <div key={interview.id} className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-muted/20 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{interview.role}</div>
                          <div className="text-sm text-muted-foreground">{interview.company}</div>
                          <div className="text-xs text-muted-foreground">
                            {interview.date} • {interview.duration}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge 
                          variant={getScoreBadgeVariant(interview.score)}
                          className="font-semibold"
                        >
                          {interview.score}%
                        </Badge>
                        <div className="flex space-x-2">
                          <a href="/feedback">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </a>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              alert('[BACKEND INTEGRATION REQUIRED: Call /api/report/' + interview.id + '/download to fetch and download the PDF file.]');
                            }}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SchedulePracticeModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onSuccess={() => {
          // Optionally refresh data or show success message
          console.log('Interview scheduled successfully!');
        }}
      />

      <ScheduledInterviewsModal
        isOpen={interviewsModalOpen}
        onClose={() => setInterviewsModalOpen(false)}
        onScheduleNew={() => {
          setInterviewsModalOpen(false);
          setScheduleModalOpen(true);
        }}
      />
    </div>
  );
}
import { useState } from 'react';
import { Play, Pause, RotateCcw, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const mockTimelineEvents = [
  { id: 1, time: '0:15', type: 'question', score: 85, event: 'Strong opening response' },
  { id: 2, time: '1:23', type: 'hesitation', score: 60, event: 'Brief pause detected' },
  { id: 3, time: '2:10', type: 'confident', score: 92, event: 'Excellent technical explanation' },
  { id: 4, time: '3:45', type: 'improvement', score: 70, event: 'Could improve eye contact' },
  { id: 5, time: '4:30', type: 'strong', score: 88, event: 'Great closing statement' }
];

export default function InteractiveDashboard() {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<typeof mockTimelineEvents[0] | null>(null);

  const handleEventClick = (event: typeof mockTimelineEvents[0]) => {
    setCurrentTime(parseInt(event.time.split(':')[1]));
    setSelectedEvent(event);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'question': return 'bg-blue-500/20 border-blue-500/50';
      case 'confident': case 'strong': return 'bg-green-500/20 border-green-500/50';
      case 'improvement': return 'bg-yellow-500/20 border-yellow-500/50';
      case 'hesitation': return 'bg-red-500/20 border-red-500/50';
      default: return 'bg-muted/20 border-border';
    }
  };

  return (
    <div className="premium-card max-w-6xl mx-auto">
      <div className="mb-6">
        <h3 className="text-2xl font-semibold mb-2">Interactive Feedback Dashboard</h3>
        <p className="text-muted-foreground">
          This is a preview of how KARA AI analyzes your interview performance in real-time.
          Click on timeline events to jump to specific moments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player Mock */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative bg-muted/20 rounded-lg aspect-video flex items-center justify-center border border-border/50">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <Play className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground">Mock Interview Recording</p>
              {selectedEvent && (
                <Badge className={getEventColor(selectedEvent.type)}>
                  Jumped to: {selectedEvent.event}
                </Badge>
              )}
            </div>
          </div>

          {/* Video Controls */}
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <Progress value={currentTime} className="h-2" />
            </div>
            <span className="text-sm text-muted-foreground">
              {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')} / 5:00
            </span>
          </div>
        </div>

        {/* Analysis Panel */}
        <div className="space-y-6">
          {/* Overall Scores */}
          <div className="space-y-4">
            <h4 className="font-semibold">Overall Performance</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Clarity</span>
                <span className="text-sm font-medium text-green-500">85%</span>
              </div>
              <Progress value={85} className="h-2" />
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Confidence</span>
                <span className="text-sm font-medium text-yellow-500">72%</span>
              </div>
              <Progress value={72} className="h-2" />
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Content</span>
                <span className="text-sm font-medium text-green-500">89%</span>
              </div>
              <Progress value={89} className="h-2" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            <Button className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download PDF Report
            </Button>
            <Button variant="outline" className="w-full">
              <Eye className="w-4 h-4 mr-2" />
              View Full Analysis
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline Events */}
      <div className="mt-8">
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="model-answers">Model Answers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="timeline" className="space-y-4 mt-4">
            <h4 className="font-semibold">Interactive Timeline</h4>
            <div className="space-y-2">
              {mockTimelineEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className={`w-full p-3 rounded-lg border text-left transition-all hover:scale-[1.01] ${getEventColor(event.type)} ${
                    selectedEvent?.id === event.id ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium">{event.time}</span>
                      <span className="text-sm">{event.event}</span>
                    </div>
                    <span className={`text-sm font-medium ${getScoreColor(event.score)}`}>
                      {event.score}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="summary" className="mt-4">
            <div className="premium-card">
              <h4 className="font-semibold mb-3">Performance Summary</h4>
              <div className="space-y-3 text-sm">
                <p><strong>Strengths:</strong> Excellent technical knowledge, clear articulation</p>
                <p><strong>Areas to improve:</strong> Eye contact consistency, reduce filler words</p>
                <p><strong>Overall impression:</strong> Strong candidate with minor presentation improvements needed</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="model-answers" className="mt-4">
            <div className="premium-card">
              <h4 className="font-semibold mb-3">AI-Generated Model Answers</h4>
              <p className="text-muted-foreground text-sm">
                Compare your responses with AI-optimized answers for each question.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
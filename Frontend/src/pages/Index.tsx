import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import FeatureCard from '@/components/FeatureCard';
import TestimonialCard from '@/components/TestimonialCard';
import InteractiveDashboard from '@/components/InteractiveDashboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Video, 
  BarChart3, 
  Users, 
  FileText, 
  Target,
  ArrowRight,
  Play,
  Star,
  CheckCircle
} from 'lucide-react';
import heroImage from '@/assets/hero-ai-coaching.jpg';

const features = [
  {
    icon: Brain,
    title: "Adaptive AI Interviews",
    description: "Experience dynamic interviews that adapt to your responses and skill level in real-time."
  },
  {
    icon: Video,
    title: "Multi-Modal Analysis",
    description: "Advanced AI analyzes your speech, tone, body language, and facial expressions simultaneously."
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description: "Detailed analytics and score progression to track your improvement over time."
  },
  {
    icon: Users,
    title: "AI Persona Selection",
    description: "Practice with different interviewer personalities - from friendly HR to strict technical leads."
  },
  {
    icon: FileText,
    title: "PDF Reports",
    description: "Download comprehensive reports with actionable feedback and improvement suggestions."
  },
  {
    icon: Target,
    title: "Model Answer Comparison",
    description: "Compare your responses with AI-generated optimal answers for each question."
  }
];

const testimonials = [
  {
    quote: "KARA AI helped me land my dream job at a Fortune 500 company. The feedback was incredibly detailed and actionable.",
    name: "Sarah Chen",
    role: "Software Engineer",
    company: "Google"
  },
  {
    quote: "The AI persona feature is game-changing. I practiced with different interviewer types and felt prepared for anything.",
    name: "Marcus Johnson",
    role: "Product Manager",
    company: "Meta"
  },
  {
    quote: "The multimodal analysis caught things I never noticed about my body language. Improved my confidence tremendously.",
    name: "Emily Rodriguez",
    role: "Data Scientist",
    company: "Netflix"
  }
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="AI Coaching Interface" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/60"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
              🚀 AI-Powered Interview Coaching
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              The AI Coach That{' '}
              <span className="hero-gradient-text">Gets You Hired</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto">
              KARA AI analyzes every word, tone, and gesture to provide the data-driven feedback 
              you need to master your interviews.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <a href="/signup">
                <Button size="lg" className="text-lg px-8 py-4 bg-primary hover:bg-primary/90 animate-glow">
                  Start Your Free Session
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
              <Button size="lg" variant="outline" className="text-lg px-8 py-4">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Free to start</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>10,000+ successful interviews</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-1/4 left-10 w-20 h-20 bg-primary/10 rounded-full animate-float"></div>
        <div className="absolute top-1/2 right-10 w-16 h-16 bg-vibrant-magenta/10 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 left-1/4 w-12 h-12 bg-primary/10 rounded-full animate-float" style={{ animationDelay: '4s' }}></div>
      </section>

      {/* Interactive Demo Section */}
      <section className="py-24 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              See KARA AI in Action
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Experience our interactive feedback dashboard. Click on timeline events to see 
              how our AI analyzes every moment of your interview.
            </p>
          </div>
          
          <InteractiveDashboard />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Powered by Advanced AI
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our cutting-edge technology provides comprehensive analysis that goes beyond 
              what human coaches can offer.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-24 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Trusted by Top Performers
            </h2>
            <div className="flex items-center justify-center space-x-2 mb-8">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="text-lg text-muted-foreground ml-2">4.9/5 from 2,000+ users</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={index}
                {...testimonial}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Ace Your Next Interview?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of professionals who've landed their dream jobs with KARA AI.
          </p>
          <a href="/signup">
            <Button size="lg" className="text-lg px-8 py-4 bg-primary hover:bg-primary/90 animate-glow">
              Start Your Free Session Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Quote } from 'lucide-react';

interface TestimonialCardProps {
  quote: string;
  name: string;
  role: string;
  company: string;
  avatar?: string;
}

export default function TestimonialCard({ quote, name, role, company, avatar }: TestimonialCardProps) {
  return (
    <div className="premium-card group">
      <div className="relative">
        <Quote className="absolute -top-2 -left-1 h-8 w-8 text-primary/30 group-hover:text-primary/50 transition-colors" />
        <blockquote className="text-foreground leading-relaxed mb-6 pt-6">
          "{quote}"
        </blockquote>
      </div>
      <div className="flex items-center space-x-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold text-foreground">{name}</div>
          <div className="text-sm text-muted-foreground">{role} at {company}</div>
        </div>
      </div>
    </div>
  );
}
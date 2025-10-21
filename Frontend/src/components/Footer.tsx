import { Github, Twitter, Linkedin, Mail } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Footer() {
  return (
    <footer className="bg-card/50 border-t border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Logo showText size={28} />
            <p className="text-muted-foreground max-w-sm">
              The AI-powered interview coaching platform that helps you master your next opportunity.
            </p>

            {/* Socials only; navigation removed */}
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Columns placeholders with non-clickable labels only (no navigation) */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Product</h3>
            <p className="text-sm text-muted-foreground">All product areas are accessible directly on the site.</p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Resources</h3>
            <p className="text-sm text-muted-foreground">Resources are embedded in the app experience.</p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Company</h3>
            <p className="text-sm text-muted-foreground">Learn more within the app.</p>
          </div>
        </div>

        <div className="border-t border-border/50 mt-8 pt-8 text-center">
          <p className="text-muted-foreground">
            © 2024 Nova Arc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
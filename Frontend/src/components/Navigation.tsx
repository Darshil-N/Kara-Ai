import { useState, useEffect } from 'react';
import { Menu, X, User, Bell, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import { useAuth } from '@/lib/AuthContext';
import { useGoogleDrive } from '@/lib/GoogleDriveContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NavigationProps {
  // We can remove these props since we'll use AuthContext
}

export default function Navigation({ }: NavigationProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const { user, signOut: authSignOut } = useAuth();
  const { disconnectFromDrive } = useGoogleDrive();
  
  const isAuthenticated = !!user;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const signOut = async () => {
    // Only sign out from Google Drive when explicitly signing out from the app
    // This preserves Google Drive connection during navigation
    console.log('User explicitly signing out - clearing Google Drive connection');
    disconnectFromDrive();
    await authSignOut();
    navigate('/');
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'glass-nav' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Logo showText className="hover:opacity-90 transition-opacity" size={28} />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="text-foreground hover:text-primary transition-colors">
                  Dashboard
                </Link>
                <Link to="/interview-setup" className="text-foreground hover:text-primary transition-colors">
                  Start Session
                </Link>
                <Link to="/feedback" className="text-foreground hover:text-primary transition-colors">
                  History
                </Link>
              </>
            ) : (
              <>
                <a href="#features" className="text-foreground hover:text-primary transition-colors">
                  Features
                </a>
                <Link to="/pricing" className="text-foreground hover:text-primary transition-colors">
                  Pricing
                </Link>
              </>
            )}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-0 right-0 h-2 w-2 bg-primary rounded-full animate-pulse"></span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback>{user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user?.user_metadata?.full_name || user?.email}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/settings')}>Settings</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/pricing')}>Upgrade to Premium</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={signOut}>
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-foreground hover:text-primary">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    Sign Up Free
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-card/80 backdrop-blur-xl">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="block px-3 py-2 text-base font-medium text-foreground hover:text-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/interview-setup"
                    className="block px-3 py-2 text-base font-medium text-foreground hover:text-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Start Session
                  </Link>
                  <Link
                    to="/feedback"
                    className="block px-3 py-2 text-base font-medium text-foreground hover:text-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    History
                  </Link>
                </>
              ) : (
                <>
                  <a
                    href="#features"
                    className="block px-3 py-2 text-base font-medium text-foreground hover:text-primary"
                  >
                    Features
                  </a>
                  <Link
                    to="/pricing"
                    className="block px-3 py-2 text-base font-medium text-foreground hover:text-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                </>
              )}
              <div className="pt-4 pb-2 border-t border-border/50">
                {!isAuthenticated && (
                <div className="space-y-2">
                    <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        Login
                      </Button>
                    </Link>
                    <Link to="/signup" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full bg-primary hover:bg-primary/90">
                        Sign Up Free
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
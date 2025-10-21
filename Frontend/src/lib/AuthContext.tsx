import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isInitialized = false;
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting initial session:', error);
      }
      console.log('Initial session check:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      isInitialized = true;
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, !!session);
        
        // Don't process events before initial load is complete
        if (!isInitialized && event !== 'SIGNED_IN') {
          return;
        }
        
        // Process all auth events but be more careful about clearing state
        if (event === 'SIGNED_IN') {
          console.log('User signed in');
          setSession(session);
          setUser(session?.user ?? null);
        } else if (event === 'SIGNED_OUT') {
          // Check if this is an intentional sign out or a disruption during Google Drive auth
          const isGoogleDriveAuthInProgress = sessionStorage.getItem('google_drive_auth_in_progress') === 'true';
          
          if (isGoogleDriveAuthInProgress) {
            console.log('SIGNED_OUT event during Google Drive auth - ignoring to prevent disruption');
            return;
          }
          
          console.log('User signed out');
          setSession(null);
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('Token refreshed');
          setSession(session);
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      console.log('Signing out user');
      await supabase.auth.signOut();
      // Clear any locally stored auth state
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
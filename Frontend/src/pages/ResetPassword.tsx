import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';

// This page handles both:
// 1) Requesting a password reset email
// 2) Setting a new password after clicking the reset link
export default function ResetPassword() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // If the user arrived via the Supabase reset link, a session will be set.
    // In that case, switch to the "reset" mode to collect the new password.
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setMode('reset');
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('reset');
    });

    return () => { listener.subscription.unsubscribe(); };
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth/reset',
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage('Password reset email sent. Please check your inbox.');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    // After successful reset, send them to login or dashboard
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{mode === 'request' ? 'Reset your password' : 'Set a new password'}</h1>
          <p className="text-muted-foreground mt-2">
            {mode === 'request' ? 'Enter your email to receive a reset link.' : 'Choose a new password for your account.'}
          </p>
        </div>

        {mode === 'request' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter a new password" />
              <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters recommended.</p>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter the new password" />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Update password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
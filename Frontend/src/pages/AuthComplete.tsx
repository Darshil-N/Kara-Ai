import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { profileService } from '@/lib/databaseService';

export default function AuthComplete() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/login');
        return;
      }
      setEmail(session.user.email ?? null);
    };
    init();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated.');
        setLoading(false);
        return;
      }

      // Update user metadata and optionally set a password
      const { error: updateErr } = await supabase.auth.updateUser({
        data: { username },
        ...(password ? { password } : {}),
      } as any);
      
      if (updateErr) {
        setError(updateErr.message);
        setLoading(false);
        return;
      }

      // Create or update profile in the profiles table
      await profileService.upsertProfile({
        username,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || username
      });

      setLoading(false);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Complete your profile</h1>
          <p className="text-muted-foreground mt-2">Set a username and password for future logins.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="yourusername" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Create a password" />
            <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters recommended.</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Save and continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}
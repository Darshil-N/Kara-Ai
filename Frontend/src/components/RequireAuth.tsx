import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

/**
 * RequireAuth wraps protected routes. If user is not authenticated,
 * it redirects to /login with a redirect param back to the original path.
 */
export default function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const { user, loading } = useAuth();

  console.log('RequireAuth check:', { loading, hasUser: !!user, pathname: location.pathname });

  // Show loading while auth is being determined
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // If no user, check if we should be more patient
  if (!user) {
    // Check if Google Drive auth is in progress
    const isGoogleDriveAuthInProgress = sessionStorage.getItem('google_drive_auth_in_progress') === 'true';
    
    if (isGoogleDriveAuthInProgress) {
      console.log('RequireAuth: Google Drive auth in progress, waiting...');
      return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div>Connecting to Google Drive...</div>
          <div className="text-sm text-gray-500 mt-2">Please complete authentication in the popup window</div>
        </div>
      </div>;
    }
    
    console.log('RequireAuth: No user found, redirecting to login');
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return children;
}
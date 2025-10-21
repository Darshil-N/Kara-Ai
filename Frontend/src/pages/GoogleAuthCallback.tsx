// Google OAuth callback handler
import { useEffect } from 'react';

const GoogleAuthCallback = () => {
  useEffect(() => {
    console.log('Google Auth Callback - Full URL:', window.location.href);
    console.log('Google Auth Callback - Hash:', window.location.hash);
    console.log('Google Auth Callback - Search:', window.location.search);
    
    // Parse the hash fragment for access token
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const error = hashParams.get('error');

    console.log('Access token found:', !!accessToken);
    console.log('Error found:', error);

    if (accessToken) {
      console.log('Sending success message to parent window');
      // Store token locally first
      localStorage.setItem('google_drive_token', accessToken);
      
      // Try to communicate with parent window
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            accessToken: accessToken
          }, window.location.origin);
          console.log('Message sent to parent, closing popup');
          window.close();
        } catch (error) {
          console.error('Error sending message to parent:', error);
          // Close popup anyway since token is stored
          window.close();
        }
      } else {
        // No opener or opener is closed - just store token and close
        console.log('No valid opener window, token stored locally, closing popup');
        window.close();
      }
    } else if (error) {
      console.log('Authentication error occurred:', error);
      // Try to communicate error to parent window
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: error
          }, window.location.origin);
          console.log('Error message sent to parent, closing popup');
          window.close();
        } catch (commError) {
          console.error('Error sending error message to parent:', commError);
          // Close popup anyway
          window.close();
        }
      } else {
        // No opener - just close the popup, parent will handle timeout
        console.log('No valid opener window, closing popup with error');
        window.close();
      }
    } else {
      console.log('No token or error found, checking in 2 seconds...');
      // Try again in case hash takes time to load
      setTimeout(() => {
        const retryHashParams = new URLSearchParams(window.location.hash.substring(1));
        const retryAccessToken = retryHashParams.get('access_token');
        if (retryAccessToken) {
          console.log('Found token on retry');
          // Store token locally first
          localStorage.setItem('google_drive_token', retryAccessToken);
          
          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_SUCCESS',
                accessToken: retryAccessToken
              }, window.location.origin);
              console.log('Retry message sent to parent, closing popup');
            } catch (error) {
              console.error('Error sending retry message to parent:', error);
            }
          }
          // Always close the popup, never redirect
          window.close();
        } else {
          // No token found even on retry - close popup
          console.log('No token found on retry, closing popup');
          window.close();
        }
      }, 2000);
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Completing authentication...</h2>
        <p className="text-gray-600">This window will close automatically.</p>
        <div className="mt-4 text-sm text-gray-500">
          <p>If this window doesn't close automatically, please close it manually.</p>
        </div>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
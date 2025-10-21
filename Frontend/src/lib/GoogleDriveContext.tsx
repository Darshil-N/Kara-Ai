import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { simpleGoogleDriveService } from './simpleGoogleDriveService';

interface GoogleDriveContextType {
  isConnected: boolean;
  isConfigured: boolean;
  isInitialized: boolean;
  connectToDrive: () => Promise<boolean>;
  disconnectFromDrive: () => void;
  checkConnection: () => Promise<boolean>;
  refreshConnection: () => Promise<void>;
}

const GoogleDriveContext = createContext<GoogleDriveContextType | undefined>(undefined);

export function GoogleDriveProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Google Drive state on mount
  useEffect(() => {
    const initializeGoogleDrive = async () => {
      try {
        const configured = simpleGoogleDriveService.isConfigured();
        setIsConfigured(configured);
        
        if (configured) {
          const hasToken = simpleGoogleDriveService.hasAccessToken();
          if (hasToken) {
            // Validate the existing token
            const isValid = await simpleGoogleDriveService.isValidAuthenticated();
            setIsConnected(isValid);
          } else {
            setIsConnected(false);
          }
        }
        
        setIsInitialized(true);
        console.log('Google Drive state initialized:', { configured, hasToken: simpleGoogleDriveService.hasAccessToken(), isConnected });
      } catch (error) {
        console.error('Error initializing Google Drive:', error);
        setIsInitialized(true);
      }
    };

    // Listen for storage changes (when popup stores token)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'google_drive_token' && e.newValue) {
        console.log('Google Drive token detected from storage event');
        checkConnection();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    initializeGoogleDrive();
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const connectToDrive = async (): Promise<boolean> => {
    // Set a flag to indicate Google Drive auth is in progress
    sessionStorage.setItem('google_drive_auth_in_progress', 'true');
    
    // Set a timeout to clear the flag in case auth gets stuck
    const timeoutId = setTimeout(() => {
      sessionStorage.removeItem('google_drive_auth_in_progress');
      console.log('Google Drive auth timeout - cleared flag');
    }, 30000); // 30 seconds timeout
    
    try {
      console.log('Attempting to connect to Google Drive...');
      
      const token = await simpleGoogleDriveService.getAccessToken();
      const success = !!token;
      setIsConnected(success);
      
      if (success) {
        console.log('Successfully connected to Google Drive');
      } else {
        // Check if token was stored but popup communication failed
        console.log('Checking for stored token after popup attempt...');
        setTimeout(async () => {
          const hasToken = simpleGoogleDriveService.hasAccessToken();
          if (hasToken) {
            const isValid = await simpleGoogleDriveService.isValidAuthenticated();
            setIsConnected(isValid);
            if (isValid) {
              console.log('Found valid stored token after popup');
            }
          }
        }, 1000);
      }
      
      return success;
    } catch (error) {
      console.error('Error connecting to Google Drive:', error);
      
      // Even on error, check if token was stored
      setTimeout(async () => {
        const hasToken = simpleGoogleDriveService.hasAccessToken();
        if (hasToken) {
          const isValid = await simpleGoogleDriveService.isValidAuthenticated();
          setIsConnected(isValid);
          if (isValid) {
            console.log('Found valid stored token despite connection error');
          }
        }
      }, 1000);
      
      setIsConnected(false);
      return false;
    } finally {
      // Always clear the flag and timeout
      clearTimeout(timeoutId);
      sessionStorage.removeItem('google_drive_auth_in_progress');
    }
  };

  const disconnectFromDrive = (): void => {
    try {
      console.log('Disconnecting from Google Drive...');
      simpleGoogleDriveService.signOut();
      setIsConnected(false);
      console.log('Disconnected from Google Drive');
    } catch (error) {
      console.error('Error disconnecting from Google Drive:', error);
    }
  };

  const checkConnection = async (): Promise<boolean> => {
    try {
      if (!simpleGoogleDriveService.hasAccessToken()) {
        setIsConnected(false);
        return false;
      }
      
      const isValid = await simpleGoogleDriveService.isValidAuthenticated();
      setIsConnected(isValid);
      return isValid;
    } catch (error) {
      console.error('Error checking Google Drive connection:', error);
      setIsConnected(false);
      return false;
    }
  };

  const refreshConnection = async (): Promise<void> => {
    try {
      await checkConnection();
    } catch (error) {
      console.error('Error refreshing Google Drive connection:', error);
    }
  };

  const value = {
    isConnected,
    isConfigured,
    isInitialized,
    connectToDrive,
    disconnectFromDrive,
    checkConnection,
    refreshConnection,
  };

  return (
    <GoogleDriveContext.Provider value={value}>
      {children}
    </GoogleDriveContext.Provider>
  );
}

export function useGoogleDrive() {
  const context = useContext(GoogleDriveContext);
  if (context === undefined) {
    throw new Error('useGoogleDrive must be used within a GoogleDriveProvider');
  }
  return context;
}
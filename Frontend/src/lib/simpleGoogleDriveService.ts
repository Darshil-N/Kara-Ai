// Simplified Google Drive service with better error handling
import { supabase } from './supabaseClient';

interface GoogleDriveUploadResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  error?: string;
}

class SimpleGoogleDriveService {
  private apiKey: string;
  private clientId: string;
  private isInitialized = false;
  private accessToken: string | null = null;

  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || '';
    this.clientId = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID || '';
    
    // Check for existing token in localStorage
    const storedToken = localStorage.getItem('google_drive_token');
    if (storedToken) {
      this.accessToken = storedToken;
      // Validate the token on initialization
      this.validateToken();
    }
  }

  // Check if credentials are configured
  isConfigured(): boolean {
    return !!(this.apiKey && this.clientId && 
             this.apiKey !== 'your_actual_api_key_here' && 
             this.clientId !== 'your_actual_client_id_here');
  }

  // Get access token using OAuth popup
  async getAccessToken(): Promise<string | null> {
    if (!this.isConfigured()) {
      console.error('Google Drive credentials not configured');
      return null;
    }

    try {
      // Create OAuth URL
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${this.clientId}&` +
        `response_type=token&` +
        `scope=https://www.googleapis.com/auth/drive.file&` +
        `redirect_uri=${encodeURIComponent(window.location.origin + '/google-auth-callback')}`;

      // Open popup for authentication with better parameters
      const popup = window.open(
        authUrl, 
        'google-auth', 
        'width=500,height=600,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no'
      );
      
      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site and try again.');
      }
      
      return new Promise((resolve, reject) => {
        let resolved = false;
        
        const checkClosed = setInterval(() => {
          if (popup?.closed && !resolved) {
            clearInterval(checkClosed);
            resolved = true;
            reject(new Error('Authentication cancelled by user'));
          }
        }, 1000);

        // Listen for the token in the popup
        const messageListener = (event: MessageEvent) => {
          if (resolved) return; // Prevent multiple resolutions
          
          if (event.origin === window.location.origin && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
            resolved = true;
            clearInterval(checkClosed);
            window.removeEventListener('message', messageListener);
            popup?.close();
            
            this.accessToken = event.data.accessToken;
            localStorage.setItem('google_drive_token', event.data.accessToken);
            console.log('Google Drive authentication successful, staying on current page');
            resolve(event.data.accessToken);
          } else if (event.origin === window.location.origin && event.data.type === 'GOOGLE_AUTH_ERROR') {
            resolved = true;
            clearInterval(checkClosed);
            window.removeEventListener('message', messageListener);
            popup?.close();
            reject(new Error(event.data.error));
          }
        };

        window.addEventListener('message', messageListener);
        
        // Cleanup function in case of timeout
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            clearInterval(checkClosed);
            window.removeEventListener('message', messageListener);
            popup?.close();
            reject(new Error('Authentication timeout - please try again'));
          }
        }, 60000); // 60 second timeout
      });
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Upload file to Google Drive using REST API
  async uploadVideo(blob: Blob, fileName: string, userId: string): Promise<GoogleDriveUploadResult> {
    try {
      // Check if we have a valid token
      if (!this.accessToken || !(await this.validateToken())) {
        console.log('Getting new Google Drive access token...');
        const token = await this.getAccessToken();
        if (!token) {
          return { success: false, error: 'Failed to get access token' };
        }
      }

      // Step 1: Create folder structure
      const folderId = await this.ensureFolderStructure(userId);
      if (!folderId) {
        return { success: false, error: 'Failed to create folder structure' };
      }

      // Step 2: Upload file
      const fileMetadata = {
        name: `${fileName}.webm`,
        parents: [folderId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
      form.append('file', blob);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: form
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, clear it
          this.signOut();
          return { success: false, error: 'Authentication expired. Please reconnect to Google Drive.' };
        }
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Step 3: Make file public
      await this.makeFilePublic(result.id);

      // Step 4: Get public link
      const webViewLink = `https://drive.google.com/file/d/${result.id}/view`;

      return {
        success: true,
        fileId: result.id,
        webViewLink: webViewLink
      };

    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      return { success: false, error: error.message };
    }
  }

  // Ensure folder structure exists
  private async ensureFolderStructure(userId: string): Promise<string | null> {
    try {
      // Check for main folder
      const mainFolderId = await this.findOrCreateFolder('Kara-AI-video-upload', null);
      if (!mainFolderId) return null;

      // Check for user folder
      const userFolderId = await this.findOrCreateFolder(userId, mainFolderId);
      return userFolderId;
    } catch (error) {
      console.error('Error ensuring folder structure:', error);
      return null;
    }
  }

  // Find or create folder
  private async findOrCreateFolder(name: string, parentId: string | null): Promise<string | null> {
    try {
      // Search for existing folder
      const searchQuery = parentId 
        ? `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
        : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}`, 
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      const searchResult = await searchResponse.json();
      
      if (searchResult.files && searchResult.files.length > 0) {
        return searchResult.files[0].id;
      }

      // Create folder if it doesn't exist
      const folderMetadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId && { parents: [parentId] })
      };

      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(folderMetadata)
      });

      const createResult = await createResponse.json();
      return createResult.id;
    } catch (error) {
      console.error('Error finding/creating folder:', error);
      return null;
    }
  }

  // Make file publicly viewable
  private async makeFilePublic(fileId: string): Promise<void> {
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      });
    } catch (error) {
      console.error('Error making file public:', error);
    }
  }

  // Validate the current access token
  private async validateToken(): Promise<boolean> {
    if (!this.accessToken) return false;
    
    try {
      // Test the token by making a simple API call
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + this.accessToken);
      
      if (!response.ok) {
        console.log('Google Drive token validation failed, status:', response.status);
        if (response.status === 400 || response.status === 401) {
          // Token is expired or invalid
          this.signOut();
        }
        return false;
      }
      
      const result = await response.json();
      
      if (result.audience === this.clientId && result.scope && result.scope.includes('drive.file')) {
        console.log('Google Drive token is valid');
        return true;
      } else {
        console.log('Google Drive token is invalid (audience/scope mismatch), clearing token');
        this.signOut();
        return false;
      }
    } catch (error) {
      console.error('Error validating Google Drive token:', error);
      // Network error - don't clear token, might be temporary
      return false;
    }
  }

  // Check if user is authenticated with valid token
  hasAccessToken(): boolean {
    return !!this.accessToken;
  }

  // Check if user has valid authenticated session
  async isValidAuthenticated(): Promise<boolean> {
    if (!this.accessToken) return false;
    return await this.validateToken();
  }

  // Clear access token
  signOut(): void {
    this.accessToken = null;
    localStorage.removeItem('google_drive_token');
  }
}

export const simpleGoogleDriveService = new SimpleGoogleDriveService();
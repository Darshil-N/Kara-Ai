// Google Drive API integration service
import { supabase } from './supabaseClient';

// Extend Window interface to include gapi
declare global {
  interface Window {
    gapi: any;
  }
}

interface GoogleDriveConfig {
  apiKey: string;
  clientId: string;
  discoveryUrl: string;
  scope: string;
}

interface DriveFile {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink: string;
  mimeType: string;
}

class GoogleDriveService {
  private gapi: any;
  private isInitialized = false;
  private isSignedIn = false;
  private config: GoogleDriveConfig;

  constructor() {
    this.config = {
      apiKey: import.meta.env.VITE_GOOGLE_DRIVE_API_KEY,
      clientId: import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID,
      discoveryUrl: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
      scope: 'https://www.googleapis.com/auth/drive.file'
    };
  }

  // Initialize Google API
  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) return true;

      console.log('Initializing Google Drive API...');
      console.log('API Key exists:', !!this.config.apiKey);
      console.log('Client ID exists:', !!this.config.clientId);

      if (!this.config.apiKey || this.config.apiKey === 'your_actual_api_key_here') {
        console.error('Google Drive API key not configured');
        return false;
      }

      if (!this.config.clientId || this.config.clientId === 'your_actual_client_id_here') {
        console.error('Google Drive Client ID not configured');
        return false;
      }

      // Load Google API script if not already loaded
      if (!window.gapi) {
        await this.loadGoogleAPI();
      }

      this.gapi = window.gapi;

      // Load the required libraries
      await new Promise((resolve, reject) => {
        this.gapi.load('client:auth2', {
          callback: resolve,
          onerror: () => reject(new Error('Failed to load Google API libraries'))
        });
      });

      // Initialize the client with a longer timeout
      await Promise.race([
        this.gapi.client.init({
          apiKey: this.config.apiKey,
          clientId: this.config.clientId,
          discoveryDocs: [this.config.discoveryUrl],
          scope: this.config.scope
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Google API initialization timeout')), 10000)
        )
      ]);

      this.isInitialized = true;
      
      // Check if already signed in
      const authInstance = this.gapi.auth2.getAuthInstance();
      if (authInstance) {
        this.isSignedIn = authInstance.isSignedIn.get();
        console.log('Google Drive API initialized successfully, signed in:', this.isSignedIn);
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing Google Drive API:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        apiKey: this.config.apiKey ? 'Set' : 'Not set',
        clientId: this.config.clientId ? 'Set' : 'Not set'
      });
      return false;
    }
  }

  // Load Google API script dynamically
  private loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (document.querySelector('script[src*="apis.google.com"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google API script loaded successfully');
        resolve();
      };
      script.onerror = (error) => {
        console.error('Failed to load Google API script:', error);
        reject(new Error('Failed to load Google API script'));
      };
      document.head.appendChild(script);
    });
  }

  // Sign in to Google Drive
  async signIn(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        console.log('Google Drive not initialized, attempting to initialize...');
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize Google Drive API');
        }
      }

      const authInstance = this.gapi.auth2.getAuthInstance();
      if (!authInstance) {
        throw new Error('Auth instance not available');
      }

      if (!authInstance.isSignedIn.get()) {
        console.log('Attempting to sign in to Google...');
        try {
          await authInstance.signIn({
            prompt: 'select_account'
          });
        } catch (signInError) {
          console.error('Sign-in error:', signInError);
          throw new Error(`Sign-in failed: ${signInError.error || signInError.message || 'Unknown error'}`);
        }
      }

      this.isSignedIn = authInstance.isSignedIn.get();
      
      if (this.isSignedIn) {
        console.log('Successfully signed in to Google Drive');
        return true;
      } else {
        throw new Error('Sign-in was not successful');
      }
    } catch (error) {
      console.error('Error signing in to Google Drive:', error);
      return false;
    }
  }

  // Find or create the main Kara-AI-video-upload folder
  async findOrCreateMainFolder(): Promise<string | null> {
    try {
      const folderName = 'Kara-AI-video-upload';
      
      // Search for existing folder
      const response = await this.gapi.client.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)'
      });

      if (response.result.files && response.result.files.length > 0) {
        console.log(`Found existing folder: ${folderName}`);
        return response.result.files[0].id;
      }

      // Create the folder if it doesn't exist
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };

      const createResponse = await this.gapi.client.drive.files.create({
        resource: folderMetadata,
        fields: 'id'
      });

      console.log(`Created main folder: ${folderName}`);
      return createResponse.result.id;
    } catch (error) {
      console.error('Error finding/creating main folder:', error);
      return null;
    }
  }

  // Find or create user-specific folder within main folder
  async findOrCreateUserFolder(userId: string, parentFolderId: string): Promise<string | null> {
    try {
      // Search for existing user folder
      const response = await this.gapi.client.drive.files.list({
        q: `name='${userId}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)'
      });

      if (response.result.files && response.result.files.length > 0) {
        console.log(`Found existing user folder: ${userId}`);
        return response.result.files[0].id;
      }

      // Create user folder if it doesn't exist
      const folderMetadata = {
        name: userId,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId]
      };

      const createResponse = await this.gapi.client.drive.files.create({
        resource: folderMetadata,
        fields: 'id'
      });

      console.log(`Created user folder: ${userId}`);
      return createResponse.result.id;
    } catch (error) {
      console.error('Error finding/creating user folder:', error);
      return null;
    }
  }

  // Upload video to Google Drive
  async uploadVideo(
    videoBlob: Blob, 
    fileName: string, 
    userId: string
  ): Promise<{ fileId: string; webViewLink: string; webContentLink: string } | null> {
    try {
      if (!this.isSignedIn) {
        const signedIn = await this.signIn();
        if (!signedIn) return null;
      }

      // Get or create folder structure
      const mainFolderId = await this.findOrCreateMainFolder();
      if (!mainFolderId) return null;

      const userFolderId = await this.findOrCreateUserFolder(userId, mainFolderId);
      if (!userFolderId) return null;

      // Convert blob to base64 for upload
      const base64Data = await this.blobToBase64(videoBlob);
      const base64Content = base64Data.split(',')[1]; // Remove data:video/webm;base64, prefix

      const fileMetadata = {
        name: `${fileName}.webm`,
        parents: [userFolderId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(fileMetadata)], {type: 'application/json'}));
      form.append('file', videoBlob);

      // Upload using resumable upload
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token}`
        },
        body: form
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Make the file publicly viewable
      await this.makeFilePublic(result.id);

      // Get the public links
      const fileDetails = await this.getFileDetails(result.id);
      
      console.log(`Video uploaded successfully: ${fileName}`);
      return {
        fileId: result.id,
        webViewLink: fileDetails.webViewLink,
        webContentLink: fileDetails.webContentLink || `https://drive.google.com/file/d/${result.id}/view`
      };
    } catch (error) {
      console.error('Error uploading video to Google Drive:', error);
      return null;
    }
  }

  // Convert blob to base64
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Make file publicly viewable
  private async makeFilePublic(fileId: string): Promise<void> {
    try {
      await this.gapi.client.drive.permissions.create({
        fileId: fileId,
        resource: {
          role: 'reader',
          type: 'anyone'
        }
      });
      console.log(`Made file ${fileId} publicly viewable`);
    } catch (error) {
      console.error('Error making file public:', error);
    }
  }

  // Get file details
  private async getFileDetails(fileId: string): Promise<DriveFile> {
    const response = await this.gapi.client.drive.files.get({
      fileId: fileId,
      fields: 'id,name,webViewLink,webContentLink,mimeType'
    });
    return response.result;
  }

  // Check if user is signed in
  isUserSignedIn(): boolean {
    return this.isSignedIn && this.gapi?.auth2?.getAuthInstance()?.isSignedIn?.get();
  }

  // Sign out
  async signOut(): Promise<void> {
    if (this.gapi?.auth2) {
      await this.gapi.auth2.getAuthInstance().signOut();
      this.isSignedIn = false;
      console.log('Signed out from Google Drive');
    }
  }
}

// Export singleton instance
export const googleDriveService = new GoogleDriveService();
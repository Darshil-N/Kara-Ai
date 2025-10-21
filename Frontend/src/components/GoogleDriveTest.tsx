import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, CheckCircle, XCircle, Upload } from 'lucide-react';
import { simpleGoogleDriveService } from '@/lib/simpleGoogleDriveService';
import { profileService } from '@/lib/databaseService';
import { useGoogleDrive } from '@/lib/GoogleDriveContext';

export default function GoogleDriveTest() {
  const { isConnected, isConfigured, connectToDrive, disconnectFromDrive, checkConnection } = useGoogleDrive();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [status, setStatus] = useState<string>('Not initialized');
  const [testFile, setTestFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  useEffect(() => {
    loadUserProfile();
    updateStatus();
  }, [isConnected, isConfigured]);

  const updateStatus = () => {
    if (!isConfigured) {
      setStatus('Google Drive API credentials not configured');
    } else if (isConnected) {
      setStatus('Google Drive ready and signed in');
    } else {
      setStatus('Google Drive configured but not signed in');
    }
  };

  const refreshGoogleDrive = async () => {
    try {
      setStatus('Checking Google Drive status...');
      await checkConnection();
      updateStatus();
    } catch (error) {
      console.error('Error checking Google Drive status:', error);
      setStatus(`Error: ${error.message}`);
    }
  };

  const loadUserProfile = async () => {
    try {
      const profile = await profileService.getCurrentProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleSignIn = async () => {
    try {
      setStatus('Signing in to Google Drive...');
      const success = await connectToDrive();
      setStatus(success ? 'Successfully signed in to Google Drive' : 'Failed to sign in to Google Drive');
    } catch (error) {
      console.error('Error signing in:', error);
      setStatus(`Sign in error: ${error.message}`);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setTestFile(file);
      setUploadResult(null);
    }
  };

  const handleTestUpload = async () => {
    if (!testFile || !userProfile?.id) {
      setStatus('Please select a file and ensure user profile is loaded');
      return;
    }

    setIsUploading(true);
    setStatus('Uploading test file...');

    try {
      // Convert file to blob
      const blob = new Blob([testFile], { type: testFile.type });
      
      // Upload to Google Drive
      const result = await simpleGoogleDriveService.uploadVideo(
        blob,
        `test_upload_${Date.now()}`,
        userProfile.id
      );

      if (result) {
        setUploadResult(result);
        setStatus('Upload successful!');
      } else {
        setStatus('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setStatus(`Upload error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      disconnectFromDrive();
      setStatus('Signed out from Google Drive');
    } catch (error) {
      console.error('Error signing out:', error);
      setStatus(`Sign out error: ${error.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Cloud className="h-6 w-6" />
            <span>Google Drive Integration Test</span>
          </CardTitle>
          <CardDescription>
            Test the Google Drive API integration for video uploads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Status</h3>
            <p className="text-sm">{status}</p>
          </div>

          {/* Configuration Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              {isConfigured ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span>Google Drive API Configured</span>
            </div>
            {!isConfigured && (
              <Button onClick={refreshGoogleDrive} size="sm">
                Refresh Status
              </Button>
            )}
          </div>

          {/* Sign In Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span>Google Drive Connected</span>
            </div>
            {isConfigured && (
              <div className="space-x-2">
                {!isConnected ? (
                  <Button onClick={handleSignIn} size="sm">
                    Connect
                  </Button>
                ) : (
                  <Button onClick={handleSignOut} size="sm" variant="outline">
                    Disconnect
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">User Profile</h3>
            {userProfile ? (
              <div className="text-sm space-y-1">
                <p><strong>ID:</strong> {userProfile.id}</p>
                <p><strong>Email:</strong> {userProfile.email}</p>
                <p><strong>Name:</strong> {userProfile.full_name || 'Not set'}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No user profile loaded</p>
            )}
          </div>

          {/* File Upload Test */}
          {isConnected && userProfile && (
            <div className="p-4 border rounded-lg space-y-4">
              <h3 className="font-semibold">Test File Upload</h3>
              
              <div>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="video/*,audio/*,image/*"
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {testFile && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {testFile.name} ({(testFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <Button 
                onClick={handleTestUpload} 
                disabled={!testFile || isUploading}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Test Upload to Google Drive'}
              </Button>

              {/* Upload Result */}
              {uploadResult && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Upload Successful!</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>File ID:</strong> {uploadResult.fileId}</p>
                    <p><strong>View Link:</strong> 
                      <a 
                        href={uploadResult.webViewLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline ml-1"
                      >
                        Open in Google Drive
                      </a>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Instructions</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Make sure you've added Google Drive API credentials to your .env.local file</li>
              <li>Initialize the Google Drive API</li>
              <li>Sign in to your Google account</li>
              <li>Select a test file and upload it</li>
              <li>Check your Google Drive for the Kara-AI-video-upload folder</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
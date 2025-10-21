import { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, Square, Play, Circle, StopCircle, Upload, Download, Cloud, Mic, MicOff, Brain, Loader2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '@/lib/InterviewContext';
import { simpleGoogleDriveService } from '@/lib/simpleGoogleDriveService';
import { profileService, enhancedInterviewService } from '@/lib/databaseService';
import type { InterviewQuestionAnswer } from '@/lib/databaseService';
import { webSpeechService } from '@/lib/webSpeechService';
import type { TranscriptionResult } from '@/lib/webSpeechService';
import { geminiService } from '@/lib/geminiService';
import { useGoogleDrive } from '@/lib/GoogleDriveContext';

export default function InterviewLive() {
  const navigate = useNavigate();
  const { currentInterview, updateCurrentInterview, completeInterview, interviewSetupData } = useInterview();
  const { isConnected: driveConnected, isConfigured: driveConfigured, connectToDrive, checkConnection } = useGoogleDrive();

  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionNumber, setQuestionNumber] = useState(1);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // Interview data storage
  const [questionsAndAnswers, setQuestionsAndAnswers] = useState<Array<{
    question: string;
    answer: string;
    timestamp: number;
    duration: number;
  }>>([]);
  const [videoTimelines, setVideoTimelines] = useState<Array<{
    start_time: number;
    end_time: number;
    question_index: number;
  }>>([]);
  const [currentQuestionStartTime, setCurrentQuestionStartTime] = useState<number | null>(null);
  
  // User profile state
  const [userProfile, setUserProfile] = useState<any>(null);

  // AI Interview state
  const [isAIMode, setIsAIMode] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState('');
  const [aiQuestionsAndAnswers, setAiQuestionsAndAnswers] = useState<InterviewQuestionAnswer[]>([]);
  const [interviewSession, setInterviewSession] = useState<any>(null);
  const [aiInterviewCompleted, setAiInterviewCompleted] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const dataIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  // Emotion detection state
  interface EmotionFaceBox { x1:number; y1:number; x2:number; y2:number; emotion:string|null; color:string; confidence:number; _fw?:number; _fh?:number }
  const [emotionFaces, setEmotionFaces] = useState<EmotionFaceBox[]>([]);
  const [dominantEmotion, setDominantEmotion] = useState<string | null>(null);
  const emotionHistoryRef = useRef<Array<{emotion:string; t:number}>>([]);
  const lastEmotionSnapshotRef = useRef<string | null>(null);
  const frameCaptureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [emotionServiceOnline, setEmotionServiceOnline] = useState<boolean>(true);
  const lastHealthCheckRef = useRef<number>(0);

  // Mock questions for demo
  const questions = [
    "Tell me about yourself and why you're interested in this role.",
    "What is your greatest strength and how does it apply to this position?",
    "Describe a challenging project you've worked on and how you overcame obstacles.",
    "How do you handle working under pressure and tight deadlines?",
    "Where do you see yourself in 5 years and how does this role fit into your career goals?"
  ];

  useEffect(() => {
    // Check if we have an active interview session
    if (!currentInterview) {
      console.warn('No active interview session found, redirecting to setup');
      navigate('/interview-setup');
      return;
    }

    // Initialize services and load user profile
    const initializeServices = async () => {
      try {
        // Load user profile
        const profile = await profileService.getCurrentProfile();
        setUserProfile(profile);

        // Check for Google auth callback parameters
        const urlParams = new URLSearchParams(window.location.search);
        const authError = urlParams.get('error');
        if (authError) {
          setUploadStatus(`✗ Google Drive authentication error: ${authError}`);
        } else if (driveConnected) {
          setUploadStatus('✓ Google Drive already connected');
        }
      } catch (error) {
        console.error('Error initializing services:', error);
      }
    };

    initializeServices();

    // Simulate loading first question
    const timer = setTimeout(() => {
      setCurrentQuestion(questions[0]);
      setCurrentQuestionStartTime(Date.now());
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentInterview, navigate]);

  // Update status when Google Drive connection changes
  useEffect(() => {
    if (driveConnected) {
      setUploadStatus('✓ Google Drive connected');
    } else if (driveConfigured) {
      setUploadStatus('Google Drive ready, not connected');
    } else {
      setUploadStatus('Google Drive not configured');
    }
  }, [driveConnected, driveConfigured]);

  // Cleanup function for media streams
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
      if (dataIntervalRef.current) {
        clearInterval(dataIntervalRef.current);
        dataIntervalRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current = null;
      }
    };
  }, [recordedVideoUrl]);

  // Emotion frame capture lifecycle tied to camera
  useEffect(() => {
    if (isCameraOn && videoRef.current) {
      // Start interval (1 fps) for emotion detection
      frameCaptureIntervalRef.current = setInterval(() => {
        // Throttle health check every 10s
        const now = Date.now();
        if (now - lastHealthCheckRef.current > 10000) {
          lastHealthCheckRef.current = now;
          fetch('http://localhost:8080/api/emotion/health')
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => {
              setEmotionServiceOnline(!!data.ready || !!data.process);
            })
            .catch(() => setEmotionServiceOnline(false));
        }
        if (emotionServiceOnline) {
          captureAndSendFrame();
        }
      }, 1000);
    } else {
      if (frameCaptureIntervalRef.current) {
        clearInterval(frameCaptureIntervalRef.current);
        frameCaptureIntervalRef.current = null;
      }
      setEmotionFaces([]);
      setDominantEmotion(null);
      setEmotionServiceOnline(true);
    }
    return () => {
      if (frameCaptureIntervalRef.current) {
        clearInterval(frameCaptureIntervalRef.current);
        frameCaptureIntervalRef.current = null;
      }
    };
  }, [isCameraOn, emotionServiceOnline]);

  // 25 second snapshot logic
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      // Keep only last 25s entries
      emotionHistoryRef.current = emotionHistoryRef.current.filter(e => now - e.t <= 25000);
      if (emotionHistoryRef.current.length) {
        const counts: Record<string, number> = {};
        for (const e of emotionHistoryRef.current) {
          counts[e.emotion] = (counts[e.emotion] || 0) + 1;
        }
        const best = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
        lastEmotionSnapshotRef.current = best;
      }
    }, 5000); // evaluate every 5s
    return () => clearInterval(interval);
  }, []);

  const captureAndSendFrame = async () => {
    try {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // Mirror transform just like displayed
      ctx.translate(canvas.width, 0);
      ctx.scale(-1,1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      const resp = await fetch('http://localhost:8080/api/emotion/frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl })
      });
      if (!resp.ok) return;
      const json = await resp.json();
      if (json.faces) {
        const frameW = json.frame?.width || video.videoWidth || 1;
        const frameH = json.frame?.height || video.videoHeight || 1;
        setEmotionFaces(json.faces.map(f => ({...f, _fw: frameW, _fh: frameH})));
      }
      if (json.dominantEmotion) {
        setDominantEmotion(json.dominantEmotion);
        emotionHistoryRef.current.push({ emotion: json.dominantEmotion, t: Date.now() });
      }
      if (json.debug) {
        const hasEmotion = (json.faces||[]).some((f:any)=>f.emotion);
        if (!hasEmotion) {
          console.log('Emotion debug (no emotion yet)', json.debug);
        }
      }
    } catch (e) {
      // Silent fail to avoid spamming logs
    }
  };

  // Timer effect for recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording && recordingStartTime) {
      interval = setInterval(() => {
        const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
        setRecordingDuration(duration);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording, recordingStartTime]);

  // Ensure video element stays connected during recording
  useEffect(() => {
    if (isRecording && isCameraOn && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      const stream = streamRef.current;
      
      console.log('Checking video connection during recording...');
      console.log('Video srcObject:', video.srcObject);
      console.log('Stream reference:', stream);
      console.log('Video paused:', video.paused);
      console.log('Video readyState:', video.readyState);
      
      // Check if video is playing and connected to stream
      if (video.srcObject !== stream) {
        console.log('Reconnecting video during recording');
        video.srcObject = stream;
        video.play().catch(console.error);
      }
      
      // Ensure video is not paused
      if (video.paused) {
        console.log('Video was paused during recording, resuming');
        video.play().catch(console.error);
      }
      
      // Force a refresh of the video element
      const checkVideoInterval = setInterval(() => {
        if (video.paused || video.srcObject !== stream) {
          console.log('Video needs refresh during recording');
          video.srcObject = stream;
          video.play().catch(console.error);
        }
      }, 1000);
      
      return () => clearInterval(checkVideoInterval);
    }
  }, [isRecording, isCameraOn]);

  const handleNextQuestion = async () => {
    console.log('Next question clicked');
    
    // Save current question data
    if (currentQuestionStartTime) {
      const answerDuration = Date.now() - currentQuestionStartTime;
      const newQA = {
        question: currentQuestion,
        answer: "User provided verbal answer", // In a real app, you'd use speech-to-text
        timestamp: currentQuestionStartTime,
        duration: answerDuration
      };
      
      const newTimeline = {
        start_time: currentQuestionStartTime,
        end_time: Date.now(),
        question_index: questionNumber - 1
      };

      const updatedQAs = [...questionsAndAnswers, newQA];
      const updatedTimelines = [...videoTimelines, newTimeline];
      
      setQuestionsAndAnswers(updatedQAs);
      setVideoTimelines(updatedTimelines);

      // Update the interview in the database
      if (currentInterview) {
        try {
          await updateCurrentInterview({
            questions_and_answers: updatedQAs,
            video_timelines: updatedTimelines
          });
        } catch (error) {
          console.error('Error updating interview data:', error);
        }
      }
    }
    
    if (questionNumber < questions.length) {
      setCurrentQuestion(questions[questionNumber]);
      setQuestionNumber(prev => prev + 1);
      setCurrentQuestionStartTime(Date.now());
      // Reset recording state for new question
      setRecordedBlob(null);
      setRecordedVideoUrl(null);
      setUploadStatus('');
    } else {
      // End interview and save final data
      await handleInterviewComplete();
    }
  };

  const handleInterviewComplete = async () => {
    console.log('Interview completed');
    
    // Generate mock analysis scores
    const analysisScore = Math.floor(Math.random() * 20) + 80; // 80-100
    const confidenceLevel = Math.floor(Math.random() * 25) + 75; // 75-100
    const communicationScore = Math.floor(Math.random() * 15) + 85; // 85-100
    
    try {
      if (currentInterview) {
        await completeInterview({
          analysis_score: analysisScore,
          confidence_level: confidenceLevel,
          communication_score: communicationScore,
          status: 'completed'
        });
      }
      
      // Navigate to feedback/results page
      navigate('/feedback');
    } catch (error) {
      console.error('Error completing interview:', error);
      // Still navigate even if database update fails
      navigate('/feedback');
    }
  };

  const startCamera = async () => {
    console.log('startCamera function called');
    try {
      console.log('Requesting media devices...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      console.log('Media stream obtained:', stream);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to load then play
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
        };
      }

      
      setIsCameraOn(true);
      console.log('Camera state updated');
      
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Failed to access webcam or microphone. Please check permissions.');
    }
  };

  const stopCamera = () => {
    console.log('stopCamera function called');
    
    // Stop recording if camera is stopped
    if (isRecording) {
      stopRecording();
    }
    
    // Clear any remaining intervals
    if (dataIntervalRef.current) {
      clearInterval(dataIntervalRef.current);
      dataIntervalRef.current = null;
      console.log('Data interval cleared in stopCamera');
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCameraOn(false);
  };

  const startRecording = () => {
    if (!streamRef.current) {
      alert('Please start the camera first');
      return;
    }

    console.log('Starting recording...');
    console.log('Stream tracks:', streamRef.current.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));

    try {
      recordedChunksRef.current = [];
      
      // Try different MIME types for better browser compatibility
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
      ];
      
      let selectedMimeType = null;
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          console.log('Found supported MIME type:', mimeType);
          break;
        } else {
          console.log('MIME type not supported:', mimeType);
        }
      }
      
      if (!selectedMimeType) {
        throw new Error('No supported video MIME type found');
      }
      
      console.log('Using MIME type:', selectedMimeType);
      
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: selectedMimeType
      });
      
      // Alternative approach: if no MIME type specified, try to get the actual type after creation
      if (!selectedMimeType) {
        console.log('No MIME type specified, MediaRecorder will use default');
        console.log('Actual MediaRecorder MIME type:', mediaRecorder.mimeType);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size, 'bytes, type:', event.data.type);
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log('Chunk added, total chunks:', recordedChunksRef.current.length);
        } else {
          console.warn('Data available but size is 0');
        }
      };
      
      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started, state:', mediaRecorder.state);
        // Ensure video element is still connected to stream
        if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
          console.log('Reconnecting video element to stream');
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(console.error);
        }
      };
      
      mediaRecorder.onpause = () => {
        console.log('MediaRecorder paused, state:', mediaRecorder.state);
      };
      
      mediaRecorder.onresume = () => {
        console.log('MediaRecorder resumed, state:', mediaRecorder.state);
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
      };
      
      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, processing chunks...');
        console.log('Total chunks:', recordedChunksRef.current.length);
        console.log('Chunks sizes:', recordedChunksRef.current.map(chunk => chunk.size));
        
        if (recordedChunksRef.current.length === 0) {
          console.error('No recording chunks available!');
          alert('Recording failed: No video data captured. Please try again.');
          setIsRecording(false);
          return;
        }
        
        // Use the actual MIME type that was used for recording
        const blob = new Blob(recordedChunksRef.current, { type: selectedMimeType });
        setRecordedBlob(blob);
        setIsRecording(false);
        console.log('Recording stopped, blob created:', blob.size, 'bytes');
        console.log('Blob type:', blob.type);
        
        // Automatically upload the video to server
        console.log('Auto-uploading video to server...');
        await autoUploadVideo(blob);
      };
      
      // Start recording and request data every 100ms for more frequent chunks
      mediaRecorder.start(100);
      console.log('MediaRecorder.start() called, state after start:', mediaRecorder.state);
      
      // Wait a moment and check if it actually started
      setTimeout(() => {
        console.log('MediaRecorder state after 100ms:', mediaRecorder.state);
        if (mediaRecorder.state !== 'recording') {
          console.error('MediaRecorder failed to start recording!');
          alert('Failed to start recording. Please try again.');
          setIsRecording(false);
          return;
        }
      }, 100);
      
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      setRecordingDuration(0);
      setUploadStatus('');
      console.log('Recording started with 100ms intervals');
      
      // Start audio visualization
      startAudioVisualization();
      
      // Fallback: manually request data every 500ms in case ondataavailable doesn't fire
      const dataInterval = setInterval(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          try {
            mediaRecorder.requestData();
            console.log('Manually requested data');
          } catch (error) {
            console.log('Manual data request failed (this is normal):', error.message);
          }
        }
      }, 500);
      
      // Store the interval ID to clear it later
      dataIntervalRef.current = dataInterval;
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping recording, MediaRecorder state:', mediaRecorderRef.current.state);
      
      // Clear the data interval
      if (dataIntervalRef.current) {
        clearInterval(dataIntervalRef.current);
        dataIntervalRef.current = null;
        console.log('Data interval cleared');
      }
      
      // Stop audio visualization
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current = null;
      }
      
      // Only stop if it's actually recording
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        console.log('MediaRecorder.stop() called');
      } else {
        console.warn('MediaRecorder not in recording state, current state:', mediaRecorderRef.current.state);
      }
      
      setIsRecording(false);
      setRecordingStartTime(null);
      setRecordingDuration(0);
      console.log('Recording stopped');
    }
  };

  const uploadVideo = async () => {
    if (!recordedBlob) {
      alert('No video to upload. Please record a video first.');
      return;
    }

    console.log('Uploading video...');
    console.log('Blob size:', recordedBlob.size, 'bytes');
    console.log('Blob type:', recordedBlob.type);

    setIsUploading(true);
    setUploadStatus('Uploading...');

    try {
      const formData = new FormData();
      formData.append('video', recordedBlob, `interview_${questionNumber}.webm`);
      formData.append('interviewId', `interview_${Date.now()}`);
      formData.append('questionNumber', questionNumber.toString());

      const response = await fetch('http://localhost:8080/api/interview/upload-video', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadStatus(`✓ Upload successful! File: ${result.filename}`);
        console.log('Video uploaded successfully:', result);
      } else {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      setUploadStatus(`✗ Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGoogleDriveSignIn = async () => {
    try {
      setUploadStatus('Connecting to Google Drive...');
      const success = await connectToDrive();
      if (success) {
        setUploadStatus('✓ Google Drive connected successfully! You can now record videos.');
      } else {
        setUploadStatus('⏳ Please complete authentication in the popup window...');
        // Give it some time for the popup to complete and storage event to fire
        setTimeout(() => {
          if (driveConnected) {
            setUploadStatus('✓ Google Drive connected successfully!');
          } else {
            setUploadStatus('✗ Google Drive connection failed. Please try again.');
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Error signing in to Google Drive:', error);
      if (error.message.includes('cancelled')) {
        setUploadStatus('Google Drive authentication was cancelled');
      } else if (error.message.includes('blocked')) {
        setUploadStatus('✗ Popup blocked. Please allow popups and try again.');
      } else {
        setUploadStatus('✗ Google Drive connection failed. Please try again.');
      }
    }
  };

  // Auto-upload function that uploads to Google Drive
  const autoUploadVideo = async (blob: Blob) => {
    console.log('Auto-uploading video to Google Drive...');
    console.log('Blob size:', blob.size, 'bytes');
    console.log('Blob type:', blob.type);

    setIsUploading(true);
    setUploadStatus('Uploading to Google Drive...');

    try {
      // Check if Google Drive is ready
      if (!driveConfigured) {
        throw new Error('Google Drive API not configured');
      }

      if (!driveConnected) {
        setUploadStatus('Please sign in to Google Drive first');
        setIsUploading(false);
        return;
      }

      if (!userProfile?.id) {
        throw new Error('User profile not loaded');
      }

      if (!currentInterview?.interview_id) {
        throw new Error('Interview ID not available');
      }

      // Upload to Google Drive using user profile ID as folder name and interview_id as filename
      const uploadResult = await simpleGoogleDriveService.uploadVideo(
        blob,
        currentInterview.interview_id,
        userProfile.id
      );

      if (uploadResult) {
        setUploadStatus(`✓ Video uploaded to Google Drive successfully!`);
        console.log('Video uploaded to Google Drive:', uploadResult);

        // Update interview with Google Drive video URL
        if (currentInterview) {
          try {
            await updateCurrentInterview({
              video_url: uploadResult.webViewLink
            });
            console.log('Interview updated with Google Drive URL:', uploadResult.webViewLink);
          } catch (error) {
            console.error('Error updating interview with Google Drive URL:', error);
          }
        }

        // Also upload to local backend as backup
        await uploadToBackend(blob);

        // Automatically move to next question after successful upload
        setTimeout(() => {
          handleNextQuestion();
        }, 2000);
      } else {
        throw new Error('Google Drive upload failed');
      }
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      setUploadStatus(`✗ Google Drive upload failed: ${error.message}`);
      
      // Fallback to local backend upload
      console.log('Falling back to local backend upload...');
      await uploadToBackend(blob);
    } finally {
      setIsUploading(false);
    }
  };

  // Backup upload to local backend
  const uploadToBackend = async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('video', blob, `${currentInterview?.interview_id || 'interview'}_${questionNumber}.webm`);
      formData.append('interviewId', currentInterview?.interview_id || `interview_${Date.now()}`);
      formData.append('questionNumber', questionNumber.toString());
      formData.append('userId', currentInterview?.user_id || '');

      const response = await fetch('http://localhost:8080/api/interview/upload-video', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Backup upload to backend successful:', result);
        
        // If Google Drive upload failed, use backend URL
        if (!currentInterview?.video_url && result.videoUrl) {
          await updateCurrentInterview({
            video_url: result.videoUrl
          });
        }
      }
    } catch (error) {
      console.error('Backend upload error:', error);
    }
  };

  const downloadVideo = () => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview_question_${questionNumber}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert('No video available to download');
    }
  };



  // Function to format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Function to visualize audio levels during recording
  const startAudioVisualization = () => {
    if (!streamRef.current || !isRecording) return;
    
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(streamRef.current);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateVisualization = () => {
        if (!isRecording || !analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        // Update the audio level display
        const audioLevel = Math.round((average / 255) * 100);
        console.log('Audio level:', audioLevel + '%');
        
        if (isRecording) {
          animationFrameRef.current = requestAnimationFrame(updateVisualization);
        }
      };
      
      updateVisualization();
    } catch (error) {
      console.log('Audio visualization not supported:', error.message);
    }
  };

  const handleEndInterview = () => {
    console.log('End interview clicked');
    if (isCameraOn) {
      stopCamera();
    }
    // Simulate processing time then redirect
    setTimeout(() => {
      navigate('/feedback');
    }, 1000);
  };

  // AI Interview Functions
  const initializeAIInterview = async () => {
    if (!currentInterview || interviewSession) return;

    try {
      const session = await enhancedInterviewService.createInterviewSession({
        interview_id: currentInterview.interview_id,
        target_role: currentInterview.target_role || 'Software Engineer',
        interview_style: currentInterview.interview_style || 'Behavioral',
        interviewer_type: currentInterview.interviewer_type || 'Friendly'
      });

      if (session) {
        setInterviewSession(session);
        
        // Generate first question
        const firstQuestionResult = await geminiService.generateFirstQuestion({
          targetRole: session.target_role,
          interviewStyle: session.interview_style,
          interviewerType: session.interviewer_type
        });

        if (firstQuestionResult.success && firstQuestionResult.question) {
          setCurrentQuestion(firstQuestionResult.question);
        }
      }
    } catch (error) {
      console.error('Error initializing AI interview:', error);
    }
  };

  const startAIAnswer = async () => {
    if (!webSpeechService.isSupported()) {
      alert('Web Speech API is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    setIsTranscribing(true);
    setCurrentTranscript('');
    setCurrentAnalysis('');

    const result = await webSpeechService.startRecording(
      (transcript) => {
        setCurrentTranscript(transcript);
      }
    );

    if (!result.success) {
      console.error('Failed to start speech recognition:', result.error);
      setIsTranscribing(false);
    }
  };

  const handleNextAIQuestion = async () => {
    if (!isTranscribing || !interviewSession) {
      console.log('Not transcribing or no session available');
      return;
    }

    setIsProcessingAnswer(true);
    setCurrentAnalysis('Analyzing your answer...');

    try {
      // Stop transcription and get result
      const transcriptionResult: TranscriptionResult = await webSpeechService.stopRecording();
      setIsTranscribing(false);

      if (!transcriptionResult.success || !transcriptionResult.transcript.trim()) {
        setCurrentAnalysis('No speech detected. Please try again.');
        setIsProcessingAnswer(false);
        return;
      }

      // Analyze the answer with Gemini (include recent emotion snapshot if available)
      const analysisResult = await geminiService.analyzeAnswer(
        currentQuestion,
        transcriptionResult.transcript,
        {
          targetRole: interviewSession.target_role,
          interviewStyle: interviewSession.interview_style,
          interviewerType: interviewSession.interviewer_type
        },
        {
          start: transcriptionResult.startTime,
          end: transcriptionResult.endTime,
          duration: transcriptionResult.duration
        },
        {
          emotion: lastEmotionSnapshotRef.current || dominantEmotion || undefined
        }
      );

      let analysis = null;
      if (analysisResult.success && analysisResult.analysis) {
        analysis = analysisResult.analysis;
        setCurrentAnalysis(`Score: ${analysis.score}/100 - ${analysis.feedback}`);
      } else {
        setCurrentAnalysis('Analysis failed');
      }

      // Generate model answer
      const modelAnswerResult = await geminiService.generateModelAnswer(
        currentQuestion,
        { targetRole: interviewSession.target_role, interviewStyle: interviewSession.interview_style, interviewerType: interviewSession.interviewer_type }
      );

      // Create enhanced Q&A entry
      const enhancedQA: InterviewQuestionAnswer = {
        question: currentQuestion,
        answer: transcriptionResult.transcript,
        transcript: transcriptionResult.transcript,
        timestamp: {
          start: transcriptionResult.startTime,
          end: transcriptionResult.endTime,
          duration: transcriptionResult.duration
        },
        analysis: analysis || {
          score: 0,
          confidence: 0,
          communication: 0,
          content: 0,
          feedback: 'Analysis not available',
          strengths: [],
          improvements: []
        }
      };

      if (modelAnswerResult.success) {
        enhancedQA.modelAnswer = modelAnswerResult.modelAnswer;
      }

      // Update state
      const updatedAiQAs = [...aiQuestionsAndAnswers, enhancedQA];
      setAiQuestionsAndAnswers(updatedAiQAs);

      // Save to database
      await enhancedInterviewService.addQuestionAnswer(
        interviewSession.interview_id,
        enhancedQA
      );

      // Generate next question or complete interview
      if (updatedAiQAs.length >= 5) { // Limit to 5 questions for free tier
        await completeAIInterview(updatedAiQAs);
      } else {
        const nextQuestionResult = await geminiService.generateNextQuestion({
          targetRole: interviewSession.target_role,
          interviewStyle: interviewSession.interview_style,
          interviewerType: interviewSession.interviewer_type,
          previousQuestions: updatedAiQAs.map(qa => ({
            question: qa.question,
            answer: qa.answer,
            timestamp: {
              start: qa.timestamp.start,
              end: qa.timestamp.end
            }
          }))
        });

        if (nextQuestionResult.success && nextQuestionResult.question) {
          setCurrentQuestion(nextQuestionResult.question);
          setCurrentTranscript('');
          setCurrentAnalysis('');
        }
      }

    } catch (error) {
      console.error('Error processing AI next question:', error);
      setCurrentAnalysis('Error processing answer');
    } finally {
      setIsProcessingAnswer(false);
    }
  };

  const completeAIInterview = async (finalQAs?: InterviewQuestionAnswer[]) => {
    if (!interviewSession) return;

    const questionsToAnalyze = finalQAs || aiQuestionsAndAnswers;
    
    if (questionsToAnalyze.length === 0) return;

    setIsProcessingAnswer(true);
    setCurrentAnalysis('Generating final analysis...');

    try {
      // Generate final summary
      const summaryResult = await geminiService.generateFinalSummary({
        targetRole: interviewSession.target_role,
        interviewStyle: interviewSession.interview_style,
        interviewerType: interviewSession.interviewer_type,
        previousQuestions: questionsToAnalyze.map(qa => ({
          question: qa.question,
          answer: qa.answer,
          timestamp: {
            start: qa.timestamp.start,
            end: qa.timestamp.end
          }
        }))
      });

      if (summaryResult.success && summaryResult.summary) {
        // Complete the interview in database
        await enhancedInterviewService.completeInterview(
          interviewSession.interview_id,
          {
            overall_score: summaryResult.summary.overallScore,
            confidence_level: summaryResult.summary.confidenceLevel,
            communication_score: summaryResult.summary.communicationScore,
            content_score: summaryResult.summary.contentScore,
            summary: summaryResult.summary.summary,
            suggestions: summaryResult.summary.suggestions,
            key_strengths: summaryResult.summary.keyStrengths,
            areas_for_improvement: summaryResult.summary.areasForImprovement
          }
        );

        setAiInterviewCompleted(true);
        
        // Navigate to feedback page after a short delay
        setTimeout(() => {
          navigate('/feedback');
        }, 2000);
      }

    } catch (error) {
      console.error('Error completing AI interview:', error);
      setCurrentAnalysis('Error generating final analysis');
    } finally {
      setIsProcessingAnswer(false);
    }
  };

  const toggleAIMode = () => {
    setIsAIMode(!isAIMode);
    if (!isAIMode && !interviewSession) {
      initializeAIInterview();
    }
  };

  // Initialize AI interview when component mounts
  useEffect(() => {
    if (currentInterview && !interviewSession && isAIMode) {
      initializeAIInterview();
    }
  }, [currentInterview, isAIMode]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">
              Question {questionNumber} of {questions.length}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleEndInterview}
            >
              <Square className="mr-2 h-4 w-4" />
              End Interview
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Main Area */}
        <div className="flex-1 p-8 flex flex-col">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center">Interview Recording</h2>
            
            {/* Google Drive Status */}
            <div className="flex justify-center items-center space-x-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Cloud className={`h-5 w-5 ${driveConnected ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span className="text-sm">
                  Google Drive: {driveConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              {!driveConnected && driveConfigured && (
                <Button 
                  onClick={handleGoogleDriveSignIn} 
                  size="sm" 
                  variant="outline"
                >
                  <Cloud className="mr-2 h-4 w-4" />
                  Connect Google Drive
                </Button>
              )}
            </div>
            
            {/* Camera Controls */}
            <div className="flex justify-center space-x-4">
              {!isCameraOn ? (
                <Button onClick={startCamera} size="lg">
                  <Camera className="mr-2 h-5 w-5" />
                  Start Camera
                </Button>
              ) : (
                <Button onClick={stopCamera} size="lg" variant="outline">
                  <CameraOff className="mr-2 h-5 w-5" />
                  Stop Camera
                </Button>
              )}
            </div>

            {/* Recording Controls */}
            {isCameraOn && (
              <div className="flex justify-center space-x-4">
                {!isRecording ? (
                  <Button onClick={startRecording} size="lg" variant="secondary">
                    <Circle className="mr-2 h-5 w-5" />
                    Start Recording
                  </Button>
                ) : (
                  <Button onClick={stopRecording} size="lg" variant="destructive">
                    <StopCircle className="mr-2 h-5 w-5" />
                    Stop Recording
                  </Button>
                )}
              </div>
            )}

            {/* Video Display */}
            <div className="w-full max-w-4xl mx-auto">
              {isCameraOn ? (
                <div className="space-y-4">
                  {/* Live Camera Feed */}
                  <div>
                    <h3 className="text-lg font-semibold text-center mb-2">
                      Live Camera Feed
                      {isRecording && (
                        <span className="ml-2 text-red-600 animate-pulse">🔴 Recording</span>
                      )}
                    </h3>
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-96 object-cover rounded-lg border ${
                          isRecording ? 'border-red-500 border-2' : ''
                        }`}
                        style={{ transform: 'scaleX(-1)' }} // Mirror the video
                      />
                      {/* Emotion overlay */}
                      {emotionFaces.length > 0 && (
                        <div className="absolute inset-0 pointer-events-none">
                          {emotionFaces.map((f,i) => {
                            const vid = videoRef.current;
                            if (!vid) return null;
                            const frameW = f._fw || vid.videoWidth || 1;
                            const frameH = f._fh || vid.videoHeight || 1;
                            const containerW = vid.clientWidth || 1;
                            const containerH = vid.clientHeight || 1;
                            // object-cover scaling
                            const scale = Math.max(containerW / frameW, containerH / frameH);
                            const displayW = frameW * scale;
                            const displayH = frameH * scale;
                            const offsetX = (displayW - containerW) / 2;
                            const offsetY = (displayH - containerH) / 2;
                            const left = f.x1 * scale - offsetX;
                            const top = f.y1 * scale - offsetY;
                            const width = (f.x2 - f.x1) * scale;
                            const height = (f.y2 - f.y1) * scale;
                            // Since we mirrored when capturing and display is mirrored, no flip needed.
                            if (left + width < 0 || top + height < 0 || left > containerW || top > containerH) return null; // cropped out
                            const color = f.emotion ? (f.color || '#FFFFFF') : '#FFFFFF';
                            return (
                              <div key={i} style={{position:'absolute', left, top, width, height, border:`3px solid ${color}`, boxSizing:'border-box', borderRadius:'4px'}}>
                                {f.emotion ? (
                                  <div style={{background: color, color:'#000', fontSize:12, fontWeight:600, padding:'2px 4px', position:'absolute', top:-22, left:0, borderRadius:4}}>
                                    {f.emotion} {f.confidence ? (f.confidence*100).toFixed(0)+'%' : ''}
                                  </div>
                                ) : (
                                  <div style={{background: 'rgba(0,0,0,0.6)', color:'#FFF', fontSize:11, fontWeight:500, padding:'2px 4px', position:'absolute', top:-20, left:0, borderRadius:4}}>
                                    Detecting...
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Subtle recording indicator */}
                      {isRecording && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium animate-pulse">
                          REC
                        </div>
                      )}
                      {dominantEmotion && (
                        <div className="absolute top-2 left-2 bg-black/50 text-white px-3 py-1 rounded text-xs font-medium">
                          Emotion: {dominantEmotion}
                        </div>
                      )}
                      {!emotionServiceOnline && (
                        <div className="absolute bottom-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                          Emotion service offline
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="h-96 flex items-center justify-center bg-muted rounded-lg border">
                  <div className="text-center text-muted-foreground">
                    <Camera className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-lg">Camera is off</p>
                    <p className="text-sm">Click "Start Camera" to begin</p>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Status - Show auto-upload progress */}
            {uploadStatus && (
              <div className="w-full max-w-4xl mx-auto">
                <div className={`text-center p-4 rounded-lg ${
                  uploadStatus.startsWith('✓') 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : uploadStatus.startsWith('✗')
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                  {uploadStatus}
                  {isUploading && (
                    <div className="mt-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current mx-auto"></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status */}
            <div className="text-center space-y-2">
              <p>Camera Status: {isCameraOn ? 'ON' : 'OFF'}</p>
              {isCameraOn && (
                <p className="text-sm text-green-600">✓ Live video feed active</p>
              )}
              {isRecording && (
                <div className="space-y-2">
                  <p className="text-sm text-red-600 animate-pulse">🔴 Recording in progress...</p>
                  
                  {/* Recording Progress */}
                  <div className="bg-gray-200 rounded-full h-2 mx-auto max-w-md">
                    <div 
                      className="bg-red-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min((recordedChunksRef.current.length / 200) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600">
                    {recordedChunksRef.current.length} chunks recorded • 
                    {Math.round((recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0) / 1024 / 1024) * 100) / 100} MB
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Questions Sidebar */}
        <div className="w-96 border-l border-border/50 bg-card/20 p-6">
          <div className="space-y-4">

            <h3 className="font-medium text-center text-lg">Interview Questions</h3>
            
            {isLoading ? (
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground text-center">
                  Preparing your interview...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* AI Mode Toggle */}
                <div className="p-3 border rounded bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">AI Interview Mode</span>
                    <Badge variant={isAIMode ? "default" : "secondary"}>
                      {isAIMode ? "ON" : "OFF"}
                    </Badge>
                  </div>
                  <Button
                    onClick={toggleAIMode}
                    variant={isAIMode ? "secondary" : "default"}
                    size="sm"
                    className="w-full"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    {isAIMode ? "Switch to Traditional" : "Enable AI Mode"}
                  </Button>
                  {!webSpeechService.isSupported() && (
                    <p className="text-xs text-orange-600 mt-2">
                      Web Speech API not supported in this browser
                    </p>
                  )}
                </div>

                <div className="p-4 border rounded">
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Current Question:
                    </div>
                    <blockquote className="text-base font-medium leading-relaxed">
                      "{currentQuestion}"
                    </blockquote>
                    
                    {/* AI Controls */}
                    {isAIMode ? (
                      <div className="pt-2 space-y-2">
                        <Button 
                          onClick={isTranscribing ? handleNextAIQuestion : startAIAnswer}
                          variant={isTranscribing ? "default" : "secondary"}
                          disabled={isProcessingAnswer || aiInterviewCompleted}
                          className="w-full"
                        >
                          {isProcessingAnswer ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : isTranscribing ? (
                            <>
                              <Square className="w-4 h-4 mr-2" />
                              Submit Answer
                            </>
                          ) : aiInterviewCompleted ? (
                            "Interview Completed"
                          ) : (
                            <>
                              <Mic className="w-4 h-4 mr-2" />
                              Start Answering
                            </>
                          )}
                        </Button>

                        {aiQuestionsAndAnswers.length > 0 && !aiInterviewCompleted && (
                          <Button
                            variant="outline"
                            onClick={() => completeAIInterview()}
                            disabled={isProcessingAnswer || isTranscribing}
                            size="sm"
                            className="w-full"
                          >
                            Complete Interview ({aiQuestionsAndAnswers.length}/5)
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="pt-2">
                        <Button onClick={handleNextQuestion} variant="outline" className="w-full">
                          Next Question
                          <Play className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Transcript & Analysis for AI Mode */}
                {isAIMode && (currentTranscript || currentAnalysis) && (
                  <div className="space-y-3">
                    {currentTranscript && (
                      <Card className="p-3 bg-blue-50 dark:bg-blue-900/20">
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                          <Mic className="w-3 h-3 text-blue-600" />
                          Live Transcript
                        </h4>
                        <p className="text-xs text-blue-800 dark:text-blue-200">{currentTranscript}</p>
                      </Card>
                    )}
                    
                    {currentAnalysis && (
                      <Card className="p-3 bg-green-50 dark:bg-green-900/20">
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                          <Activity className="w-3 h-3 text-green-600" />
                          AI Analysis
                        </h4>
                        <p className="text-xs text-green-800 dark:text-green-200">{currentAnalysis}</p>
                      </Card>
                    )}
                  </div>
                )}

                {/* Progress Section */}
                <div className="space-y-2">
                  {isAIMode ? (
                    <>
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        AI Interview Progress ({aiQuestionsAndAnswers.length}/5):
                      </h4>
                      {aiQuestionsAndAnswers.length > 0 ? (
                        aiQuestionsAndAnswers.map((qa, index) => (
                          <div key={index} className="text-xs p-2 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <div className="font-medium">Q{index + 1}: {qa.question.substring(0, 35)}...</div>
                            <div className="text-green-600 dark:text-green-300 mt-1">
                              Score: {qa.analysis?.score || 0}/100 | 
                              Confidence: {qa.analysis?.confidence || 0}/100
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No questions answered yet</p>
                      )}
                    </>
                  ) : (
                    <>
                      <h4 className="font-medium text-sm">Traditional Progress:</h4>
                      {questions.map((question, index) => (
                        <div
                          key={index}
                          className={`text-sm p-2 rounded ${
                            index + 1 === questionNumber
                              ? 'bg-primary text-primary-foreground'
                              : index + 1 < questionNumber
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {index + 1}. {question.substring(0, 50)}...
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
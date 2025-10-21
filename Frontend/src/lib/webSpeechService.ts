/**
 * Web Speech API Service for Real-time Transcription
 * Uses the free browser-based SpeechRecognition API
 * No API keys or external costs required
 */

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// SpeechRecognition interface
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface TranscriptionSegment {
  text: string;
  timestamp: number;
  isFinal: boolean;
}

interface TranscriptionResult {
  success: boolean;
  transcript: string;
  segments: TranscriptionSegment[];
  error?: string;
  startTime: number;
  endTime: number;
  duration: number;
}

class WebSpeechService {
  private recognition: SpeechRecognition | null = null;
  private isRecording: boolean = false;
  private isStopping: boolean = false;
  private startTime: number = 0;
  private segments: TranscriptionSegment[] = [];
  private currentTranscript: string = '';
  private onTranscriptUpdate: ((transcript: string) => void) | null = null;
  private onFinalTranscript: ((result: TranscriptionResult) => void) | null = null;

  constructor() {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    // Configure recognition settings
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    // Handle results
    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const timestamp = Date.now() - this.startTime;

        if (result.isFinal) {
          finalTranscript += result[0].transcript;
          this.segments.push({
            text: result[0].transcript.trim(),
            timestamp,
            isFinal: true
          });
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Update current transcript
      this.currentTranscript = this.segments
        .filter(seg => seg.isFinal)
        .map(seg => seg.text)
        .join(' ') + (interimTranscript ? ' ' + interimTranscript : '');

      // Notify listeners of transcript updates
      if (this.onTranscriptUpdate) {
        this.onTranscriptUpdate(this.currentTranscript);
      }
    };

    // Handle errors
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      // Auto-restart on certain errors
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        setTimeout(() => {
          if (this.isRecording && this.recognition) {
            try {
              this.recognition.start();
            } catch (error) {
              console.log('Recognition restart failed:', error);
            }
          }
        }, 1000);
      }
    };

    // Handle end event
    this.recognition.onend = () => {
      // Auto-restart only if recording is intended and we're not in a forced stop
      if (this.isRecording && !this.isStopping) {
        try {
          this.recognition?.start();
        } catch (error) {
          console.log('Recognition restart failed:', error);
        }
      }
    };
  }

  /**
   * Check if Web Speech API is supported
   */
  isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Start real-time speech recognition
   */
  startRecording(
    onTranscriptUpdate?: (transcript: string) => void,
    onFinalTranscript?: (result: TranscriptionResult) => void
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.recognition) {
        resolve({ success: false, error: 'Speech Recognition not supported in this browser' });
        return;
      }

      if (this.isRecording) {
        resolve({ success: false, error: 'Already recording' });
        return;
      }

      // Reset state
      this.segments = [];
      this.currentTranscript = '';
      this.startTime = Date.now();
      this.onTranscriptUpdate = onTranscriptUpdate || null;
      this.onFinalTranscript = onFinalTranscript || null;
      this.isStopping = false;

      // Ensure any previous session is aborted before starting
      try { this.recognition.abort(); } catch { /* noop */ }

      const tryStart = (retries = 2) => {
        try {
          this.recognition!.start();
          this.isRecording = true;
          resolve({ success: true });
        } catch (error: any) {
          // Retry on invalid state/start conflicts
          const msg = String(error?.message || error);
          if (retries > 0 && /start|state/i.test(msg)) {
            setTimeout(() => tryStart(retries - 1), 300);
          } else {
            console.error('Failed to start speech recognition:', error);
            resolve({ success: false, error: error.message || 'Failed to start recognition' });
          }
        }
      };

      tryStart();
    });
  }

  /**
   * Stop speech recognition and get final transcript
   */
  stopRecording(): Promise<TranscriptionResult> {
    return new Promise((resolve) => {
      if (!this.recognition || !this.isRecording) {
        resolve({
          success: false,
          transcript: '',
          segments: [],
          error: 'Not recording',
          startTime: 0,
          endTime: 0,
          duration: 0
        });
        return;
      }

      const endTime = Date.now();
      
      // Stop recognition
      this.isStopping = true;
      try {
        this.recognition.stop();
      } catch {
        try { this.recognition.abort(); } catch { /* noop */ }
      }
      this.isRecording = false;

      // Wait a moment for final results
      setTimeout(() => {
        const result: TranscriptionResult = {
          success: true,
          transcript: this.segments.filter(seg => seg.isFinal).map(seg => seg.text).join(' ').trim(),
          segments: this.segments,
          startTime: this.startTime,
          endTime,
          duration: endTime - this.startTime
        };

        if (this.onFinalTranscript) {
          this.onFinalTranscript(result);
        }

        // Allow future restarts
        this.isStopping = false;

        resolve(result);
      }, 500);
    });
  }

  /**
   * Get current transcript (real-time)
   */
  getCurrentTranscript(): string {
    return this.currentTranscript;
  }

  /**
   * Check if currently recording
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Force stop recording
   */
  forceStop() {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
    }
  }
}

// Create singleton instance
export const webSpeechService = new WebSpeechService();

// Export types
export type { TranscriptionResult, TranscriptionSegment };


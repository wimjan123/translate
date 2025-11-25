'use client';

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type { AppSettings, TranscriptSegment, SessionMode } from '@/src/types/settings';

interface LiveSessionContextType {
  isConnected: boolean;
  isRecording: boolean;
  transcripts: TranscriptSegment[];
  error: string | null;
  sessionId: string | null;
  timer: number;
  recordingStartTime: number | null;
  isPolishing: boolean;
  polishError: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  clearTranscripts: () => void;
  handleManualPolish: () => void;
}

const LiveSessionContext = createContext<LiveSessionContextType | undefined>(undefined);

export function useLiveSession() {
  const context = useContext(LiveSessionContext);
  if (!context) {
    throw new Error('useLiveSession must be used within a LiveSessionProvider');
  }
  return context;
}

interface LiveSessionProviderProps {
  children: ReactNode;
  settings: AppSettings;
  // 2-way mode props
  sessionMode?: SessionMode;
  languageA?: string;
  languageB?: string;
}

export function LiveSessionProvider({
  children,
  settings,
  sessionMode = 'one-way',
  languageA,
  languageB,
}: LiveSessionProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishError, setPolishError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deepgramReadyRef = useRef(false);
  const recordingStartTimeRef = useRef<number | null>(null);
  const sessionActiveRef = useRef(false);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!settings.deepgramKey || !settings.openRouterKey) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
    const socket = io(socketUrl, {
      path: '/socket.io',
      auth: {
        deepgramKey: settings.deepgramKey,
        deepgramModel: settings.deepgramModel,
        openRouterKey: settings.openRouterKey,
        openRouterModel: settings.openRouterModel,
        inputLang: settings.inputLang,
        outputLang: settings.outputLang,
        enableLivePolishing: settings.enableLivePolishing,
        polishingInterval: settings.polishingInterval,
        polishingBatchSize: settings.polishingBatchSize,
        // 2-way mode fields
        sessionMode,
        languageA,
        languageB,
      },
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
      deepgramReadyRef.current = false;
    });

    socket.on('error', (data) => {
      console.error('Socket error:', data);
      setError(data.message);
    });

    socket.on('transcript', (data: { text: string; isFinal: boolean; language: string }) => {
      console.log('Transcript received:', data);
    });

    socket.on('translation', (segment: TranscriptSegment) => {
      console.log('Translation received:', segment);
      setTranscripts((prev) => [...prev, segment]);
    });

    socket.on('session-created', (data: { sessionId: string }) => {
      console.log('Session created:', data.sessionId);
      setSessionId(data.sessionId);
    });

    socket.on('instant-translation', (segment: TranscriptSegment) => {
      console.log('Instant translation received:', segment);
      setTranscripts((prev) => [...prev, segment]);
    });

    // 2-way mode translation handler
    socket.on('two-way-translation', (segment: TranscriptSegment) => {
      console.log('Two-way translation received:', segment);
      setTranscripts((prev) => [...prev, segment]);
    });

    socket.on('deepgram-ready', () => {
      console.log('Deepgram connection ready');
      deepgramReadyRef.current = true;
    });

    socket.on('deepgram-closed', () => {
      console.log('Deepgram connection closed by server');
      deepgramReadyRef.current = false;
    });

    // Polish event handlers
    socket.on('polish-started', () => {
      console.log('Polish started');
      setIsPolishing(true);
      setPolishError(null);
    });

    socket.on('polish-completed', (data: { segments: any[], polishedCount: number }) => {
      console.log('Polish completed:', data);
      setIsPolishing(false);

      // Update transcripts with polished translations
      if (data.segments && data.segments.length > 0) {
        setTranscripts((prev) => {
          const updatedTranscripts = [...prev];
          data.segments.forEach((polishedSegment) => {
            const index = updatedTranscripts.findIndex(t =>
              t.originalText === polishedSegment.originalText
            );
            if (index !== -1) {
              updatedTranscripts[index] = {
                ...updatedTranscripts[index],
                polishedTranslation: polishedSegment.polishedTranslation
              };
            }
          });
          return updatedTranscripts;
        });
      }
    });

    socket.on('polish-error', (data: { message: string }) => {
      console.error('Polish error:', data);
      setIsPolishing(false);
      setPolishError(data.message);
    });

    socket.on('polish-busy', (data: { message: string }) => {
      console.log('Polish busy:', data);
      setIsPolishing(false);
      setPolishError('Polish already in progress');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [settings, sessionMode, languageA, languageB]);

  // Timer management
  useEffect(() => {
    if (isRecording) {
      setTimer(0);
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Start recording
  const startRecording = async () => {
    if (!socketRef.current || !isConnected) {
      setError('Socket not connected');
      return;
    }

    // If we're resuming from a pause, just restart the MediaRecorder
    if (isPaused && mediaRecorderRef.current && streamRef.current) {
      console.log('Resuming recording from pause');
      mediaRecorderRef.current.start(500);
      setIsPaused(false);
      setIsRecording(true);
      return;
    }

    // If there's an active session but stopped, clear it first
    if (sessionActiveRef.current && !isRecording) {
      console.log('Clearing previous session state');
      sessionActiveRef.current = false;
      // Don't reset deepgramReadyRef - it's managed by socket connection
      setSessionId(null);
    }

    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      console.log('Microphone access granted');

      // Try different MIME types with fallback
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav',
      ];

      let mimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log('Using MIME type:', type);
          break;
        }
      }

      if (!mimeType) {
        console.log('Using default MIME type (no explicit type)');
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current && deepgramReadyRef.current) {
          socketRef.current.emit('audio-chunk', event.data);
        } else if (event.data.size > 0 && socketRef.current && !deepgramReadyRef.current) {
          // Server will recreate connection when it receives the chunk
          socketRef.current.emit('audio-chunk', event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
      };

      mediaRecorder.start(500); // Send chunks every 500ms
      mediaRecorderRef.current = mediaRecorder;
      recordingStartTimeRef.current = Date.now();
      sessionActiveRef.current = true;
      setIsRecording(true);
      setIsPaused(false);
      setError(null);
      console.log('Recording started');
    } catch (err) {
      console.error('Microphone access error:', err);
      setError('Microphone access denied');
    }
  };

  // Stop recording (complete teardown)
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear session state but keep Deepgram ready state if socket is still connected
    sessionActiveRef.current = false;
    // Don't reset deepgramReadyRef here - it's managed by socket connection
    recordingStartTimeRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
  };

  // Pause recording (keep session active)
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      setIsRecording(false);
      console.log('Recording paused');
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      setIsRecording(true);
      console.log('Recording resumed');
    } else {
      // If not paused, start fresh
      startRecording();
    }
  };

  // Clear transcripts
  const clearTranscripts = () => {
    setTranscripts([]);
    setPolishError(null);
  };

  // Handle manual polish request
  const handleManualPolish = () => {
    if (!socketRef.current || !sessionId) {
      console.error('No active session for polishing');
      setPolishError('No active session');
      return;
    }

    if (isPolishing) {
      console.log('Polish already in progress');
      return;
    }

    console.log('Requesting manual polish for session:', sessionId);
    socketRef.current.emit('polish-current-session');
  };

  const value: LiveSessionContextType = {
    isConnected,
    isRecording,
    transcripts,
    error,
    sessionId,
    timer,
    recordingStartTime: recordingStartTimeRef.current,
    isPolishing,
    polishError,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearTranscripts,
    handleManualPolish,
  };

  return (
    <LiveSessionContext.Provider value={value}>
      {children}
    </LiveSessionContext.Provider>
  );
}

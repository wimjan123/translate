'use client';

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type { AppSettings, TranscriptSegment } from '@/src/types/settings';

interface LiveSessionContextType {
  isConnected: boolean;
  isRecording: boolean;
  transcripts: TranscriptSegment[];
  error: string | null;
  sessionId: string | null;
  timer: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearTranscripts: () => void;
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
}

export function LiveSessionProvider({ children, settings }: LiveSessionProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
        enablePolishing: settings.enablePolishing,
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

    socket.on('deepgram-ready', () => {
      console.log('Deepgram connection ready');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [settings]);

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
        if (event.data.size > 0 && socketRef.current) {
          console.log('Sending audio chunk:', event.data.size, 'bytes');
          socketRef.current.emit('audio-chunk', event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
      };

      mediaRecorder.start(500); // Send chunks every 500ms
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setError(null);
      console.log('Recording started');
    } catch (err) {
      console.error('Microphone access error:', err);
      setError('Microphone access denied');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  };

  // Clear transcripts
  const clearTranscripts = () => {
    setTranscripts([]);
  };

  const value: LiveSessionContextType = {
    isConnected,
    isRecording,
    transcripts,
    error,
    sessionId,
    timer,
    startRecording,
    stopRecording,
    clearTranscripts,
  };

  return (
    <LiveSessionContext.Provider value={value}>
      {children}
    </LiveSessionContext.Provider>
  );
}

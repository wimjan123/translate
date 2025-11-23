'use client';

import { useState, useEffect } from 'react';
import { Mic, Square } from 'lucide-react';
import { useLiveSession } from '@/context/LiveSessionContext';

export function LiveControls() {
  const { isRecording, startRecording, stopRecording, clearTranscripts } = useLiveSession();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second when recording
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-16 space-y-8">
      {/* Time Display */}
      {isRecording && (
        <div className="glass px-8 py-4 rounded-2xl">
          <div className="text-5xl md:text-7xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
            {formatTime()}
          </div>
        </div>
      )}

      {/* Mic Button */}
      <div className="relative">
        {/* Glow effect when recording */}
        {isRecording && (
          <div className="absolute inset-0 rounded-full bg-red-500/30 blur-2xl animate-pulse" />
        )}

        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
            isRecording
              ? 'bg-red-500/20 border-2 border-red-500 hover:bg-red-500/30'
              : 'bg-cyan-500/10 border-2 border-cyan-400 hover:bg-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/50'
          }`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? (
            <Square className="w-8 h-8 md:w-10 md:h-10 text-red-500 fill-red-500" />
          ) : (
            <Mic className="w-8 h-8 md:w-10 md:h-10 text-cyan-400" />
          )}
        </button>
      </div>

      {/* Status Text */}
      <div className="text-center space-y-4">
        <p className="text-sm md:text-base text-slate-400">
          {isRecording ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Recording...
            </span>
          ) : (
            'Click the microphone to start recording'
          )}
        </p>

        {/* Clear Button */}
        {!isRecording && (
          <button
            onClick={clearTranscripts}
            className="px-4 py-2 text-sm border border-white/10 rounded-lg text-slate-400 hover:text-slate-200 hover:border-white/20 transition-all duration-300"
          >
            Clear Transcripts
          </button>
        )}
      </div>
    </div>
  );
}

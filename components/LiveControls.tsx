'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, Trash2 } from 'lucide-react';

interface LiveControlsProps {
  isConnected: boolean;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClear: () => void;
}

export function LiveControls({
  isConnected,
  isRecording,
  onStartRecording,
  onStopRecording,
  onClear,
}: LiveControlsProps) {
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4">
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-600">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Recording Timer */}
      {isRecording && (
        <div className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-lg">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-mono text-red-700">{formatTime(recordingTime)}</span>
        </div>
      )}

      {/* Start/Stop Button */}
      {!isRecording ? (
        <button
          onClick={onStartRecording}
          disabled={!isConnected}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Mic className="w-5 h-5" />
          Start Recording
        </button>
      ) : (
        <button
          onClick={onStopRecording}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <MicOff className="w-5 h-5" />
          Stop Recording
        </button>
      )}

      {/* Clear Button */}
      <button
        onClick={onClear}
        className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Trash2 className="w-5 h-5" />
        Clear
      </button>
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import type { TranscriptSegment } from '@/src/types/settings';

interface TranscriptViewProps {
  segments: TranscriptSegment[];
  inputLang: string;
  outputLang: string;
}

export function TranscriptView({ segments, inputLang, outputLang }: TranscriptViewProps) {
  const originalRef = useRef<HTMLDivElement>(null);
  const translatedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    if (originalRef.current) {
      originalRef.current.scrollTop = originalRef.current.scrollHeight;
    }
    if (translatedRef.current) {
      translatedRef.current.scrollTop = translatedRef.current.scrollHeight;
    }
  }, [segments]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Original Language */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">
            {inputLang.toUpperCase()} (Original)
          </h2>
        </div>
        <div
          ref={originalRef}
          className="h-96 overflow-y-auto p-4 space-y-3 bg-white"
        >
          {segments.length === 0 ? (
            <p className="text-gray-400 text-center mt-8">Waiting for audio...</p>
          ) : (
            segments.map((segment, idx) => (
              <div key={idx} className="pb-2 border-b border-gray-100 last:border-0">
                <div className="text-xs text-gray-500 mb-1">
                  {formatTime(segment.startOffsetMs)}
                </div>
                <p className="text-gray-900">{segment.originalText}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Translated Language */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
          <h2 className="text-lg font-semibold text-blue-900">
            {outputLang.toUpperCase()} (Translation)
          </h2>
        </div>
        <div
          ref={translatedRef}
          className="h-96 overflow-y-auto p-4 space-y-3 bg-white"
        >
          {segments.length === 0 ? (
            <p className="text-gray-400 text-center mt-8">Translation will appear here...</p>
          ) : (
            segments.map((segment, idx) => (
              <div key={idx} className="pb-2 border-b border-gray-100 last:border-0">
                <div className="text-xs text-blue-600 mb-1">
                  {formatTime(segment.startOffsetMs)}
                </div>
                <p className="text-gray-900">{segment.translatedText}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

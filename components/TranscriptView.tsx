'use client';

import { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { useLiveSession } from '@/context/LiveSessionContext';

export function TranscriptView() {
  const { transcripts, recordingStartTime, isPolishing } = useLiveSession();
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
  }, [transcripts]);

  const formatTime = (offsetMs: number) => {
    if (!recordingStartTime) return '--:--';
    const timestamp = new Date(recordingStartTime + offsetMs);
    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Original Language (French) */}
      <div className="rounded-xl overflow-hidden border border-white/5">
        <div className="glass px-4 py-3 border-b border-white/5">
          <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-500">
            French (Original)
          </h2>
        </div>
        <div
          ref={originalRef}
          className="h-96 overflow-y-auto p-4 space-y-3 bg-[#121214]"
        >
          {transcripts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500 text-center">
                Waiting for audio...
              </p>
            </div>
          ) : (
            transcripts.map((segment, idx) => (
              <div key={idx} className="pb-3 border-b border-white/5 last:border-0">
                <div className="text-xs text-indigo-400 mb-1 font-mono">
                  {formatTime(segment.startOffsetMs)}
                </div>
                <p className="text-slate-200 leading-relaxed">{segment.originalText}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Translated Language (English) */}
      <div className="rounded-xl overflow-hidden border border-white/5">
        <div className="glass px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-500">
            English (Translation)
          </h2>
          {isPolishing && (
            <div className="flex items-center gap-2 text-purple-400 text-sm">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Polishing...</span>
            </div>
          )}
        </div>
        <div
          ref={translatedRef}
          className="h-96 overflow-y-auto p-4 space-y-3 bg-black/40"
        >
          {transcripts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500 text-center">
                Translation will appear here...
              </p>
            </div>
          ) : (
            transcripts.map((segment, idx) => (
              <div key={idx} className="pb-3 border-b border-white/5 last:border-0">
                <div className="text-xs text-cyan-400 mb-1 font-mono">
                  {formatTime(segment.startOffsetMs)}
                </div>
                <p className="text-slate-200 leading-relaxed">
                  {segment.polishedTranslation || segment.rawTranslation || 'Translating...'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

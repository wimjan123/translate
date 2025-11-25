'use client';

import { useEffect, useRef, useState } from 'react';
import { Columns2, MessageSquare, Sparkles } from 'lucide-react';
import { useLiveSession } from '@/context/LiveSessionContext';
import { getLanguageName } from '@/src/lib/language-config';

interface TwoWayTranscriptViewProps {
  languageA: string;
  languageB: string;
}

type ViewMode = 'side-by-side' | 'conversation';

export function TwoWayTranscriptView({ languageA, languageB }: TwoWayTranscriptViewProps) {
  const { transcripts, isPolishing } = useLiveSession();
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');

  const langARef = useRef<HTMLDivElement>(null);
  const langBRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  // Filter transcripts by detected language
  const langATranscripts = transcripts.filter((t) => t.detectedLanguage === languageA);
  const langBTranscripts = transcripts.filter((t) => t.detectedLanguage === languageB);

  // Auto-scroll
  useEffect(() => {
    if (viewMode === 'side-by-side') {
      if (langARef.current) langARef.current.scrollTop = langARef.current.scrollHeight;
      if (langBRef.current) langBRef.current.scrollTop = langBRef.current.scrollHeight;
    } else {
      if (conversationRef.current) conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [transcripts, viewMode]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full">
      {/* Header with view mode toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-200">Conversation</h2>
          {isPolishing && (
            <span className="flex items-center gap-1 text-xs text-purple-400 animate-pulse">
              <Sparkles className="w-3 h-3" />
              Polishing...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 bg-[#1a1a1c] rounded-lg p-1">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'side-by-side'
                ? 'bg-purple-500/30 text-purple-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Side by side view"
          >
            <Columns2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('conversation')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'conversation'
                ? 'bg-purple-500/30 text-purple-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Conversation view"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'side-by-side' ? (
        /* Side-by-Side View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Language A Column */}
          <div className="rounded-xl overflow-hidden border border-white/5">
            <div className="glass px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-500">
                {getLanguageName(languageA)}
              </h3>
              <span className="text-xs text-slate-500">{langATranscripts.length} segments</span>
            </div>
            <div
              ref={langARef}
              className="h-96 overflow-y-auto p-4 space-y-3 bg-[#121214]"
            >
              {langATranscripts.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">
                  Waiting for {getLanguageName(languageA)} speech...
                </p>
              ) : (
                langATranscripts.map((segment, idx) => (
                  <div key={idx} className="pb-3 border-b border-white/5 last:border-0">
                    <div className="flex items-start justify-between mb-1">
                      <span className="inline-block px-2 py-0.5 bg-indigo-500/30 text-indigo-300 rounded text-xs">
                        Original
                      </span>
                      <span className="text-xs text-slate-500">{formatTime(segment.startOffsetMs)}</span>
                    </div>
                    <p className="text-indigo-200 mb-2">{segment.originalText}</p>
                    <p className="text-slate-400 text-sm pl-2 border-l-2 border-slate-600">
                      {segment.polishedTranslation || segment.rawTranslation || 'Translating...'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Language B Column */}
          <div className="rounded-xl overflow-hidden border border-white/5">
            <div className="glass px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-500">
                {getLanguageName(languageB)}
              </h3>
              <span className="text-xs text-slate-500">{langBTranscripts.length} segments</span>
            </div>
            <div
              ref={langBRef}
              className="h-96 overflow-y-auto p-4 space-y-3 bg-[#121214]"
            >
              {langBTranscripts.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">
                  Waiting for {getLanguageName(languageB)} speech...
                </p>
              ) : (
                langBTranscripts.map((segment, idx) => (
                  <div key={idx} className="pb-3 border-b border-white/5 last:border-0">
                    <div className="flex items-start justify-between mb-1">
                      <span className="inline-block px-2 py-0.5 bg-cyan-500/30 text-cyan-300 rounded text-xs">
                        Original
                      </span>
                      <span className="text-xs text-slate-500">{formatTime(segment.startOffsetMs)}</span>
                    </div>
                    <p className="text-cyan-200 mb-2">{segment.originalText}</p>
                    <p className="text-slate-400 text-sm pl-2 border-l-2 border-slate-600">
                      {segment.polishedTranslation || segment.rawTranslation || 'Translating...'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Conversation View */
        <div className="rounded-xl overflow-hidden border border-white/5">
          <div className="glass px-4 py-3 border-b border-white/5">
            <h3 className="text-lg font-semibold text-slate-200">
              {getLanguageName(languageA)} / {getLanguageName(languageB)} Conversation
            </h3>
          </div>
          <div
            ref={conversationRef}
            className="h-[500px] overflow-y-auto p-4 space-y-4 bg-[#121214]"
          >
            {transcripts.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">
                Start speaking in either language...
              </p>
            ) : (
              transcripts.map((segment, idx) => {
                const isLangA = segment.detectedLanguage === languageA;
                return (
                  <div
                    key={idx}
                    className={`flex ${isLangA ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl p-3 ${
                        isLangA
                          ? 'bg-indigo-500/20 border border-indigo-500/30'
                          : 'bg-cyan-500/20 border border-cyan-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-xs font-medium ${
                            isLangA ? 'text-indigo-300' : 'text-cyan-300'
                          }`}
                        >
                          {getLanguageName(segment.detectedLanguage || '')}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatTime(segment.startOffsetMs)}
                        </span>
                      </div>
                      <p className={`mb-2 ${isLangA ? 'text-indigo-100' : 'text-cyan-100'}`}>
                        {segment.originalText}
                      </p>
                      <p className="text-slate-400 text-sm border-t border-white/10 pt-2 mt-2">
                        {segment.polishedTranslation || segment.rawTranslation || 'Translating...'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

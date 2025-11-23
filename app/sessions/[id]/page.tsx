'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Sparkles, AlertCircle } from 'lucide-react';

interface TranscriptSegment {
  id: string;
  originalText: string;
  translatedText: string;
  polishedText: string | null;
  startTime: string;
  endTime: string;
}

interface Session {
  id: string;
  createdAt: string;
  duration: number | null;
  segmentCount: number;
  segments: TranscriptSegment[];
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polishing, setPolishing] = useState(false);
  const [polishError, setPolishError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch('/api/sessions');
        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }
        const sessions = await response.json();
        const found = sessions.find((s: Session) => s.id === params.id);

        if (!found) {
          throw new Error('Session not found');
        }

        setSession(found);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchSession();
    }
  }, [params.id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes === 0) return `${remainingSeconds}s`;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handlePolish = async () => {
    if (!session) return;

    // Get settings from localStorage
    const settingsStr = localStorage.getItem('translation-settings');
    if (!settingsStr) {
      setPolishError('Please configure your API keys in Settings first');
      return;
    }

    const settings = JSON.parse(settingsStr);
    if (!settings.openRouterKey || !settings.openRouterModel) {
      setPolishError('OpenRouter API key and model required');
      return;
    }

    setPolishing(true);
    setPolishError(null);

    try {
      const response = await fetch(`/api/sessions/${session.id}/polish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openRouterKey: settings.openRouterKey,
          openRouterModel: settings.openRouterModel,
          sourceLang: settings.inputLang || 'fr',
          targetLang: settings.outputLang || 'en',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to polish session');
      }

      const data = await response.json();

      // Update session with polished segments
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          segments: data.segments,
        };
      });
    } catch (err) {
      setPolishError(err instanceof Error ? err.message : 'Failed to polish');
    } finally {
      setPolishing(false);
    }
  };

  const hasPolishedTranslations = session?.segments.some((s) => s.polishedText);
  const canPolish = session && session.segments.length > 0 && !hasPolishedTranslations;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Loading session...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass border border-red-500/50 rounded-xl p-8 max-w-md mx-4">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <div className="text-lg text-red-300 mb-6">Error: {error || 'Session not found'}</div>
          <button
            onClick={() => router.push('/sessions')}
            className="px-6 py-3 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all duration-300"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push('/sessions')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6 transition-all duration-300"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Sessions</span>
        </button>

        <div className="glass border border-white/5 rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
              Session Details
            </h1>
            {canPolish && (
              <button
                onClick={handlePolish}
                disabled={polishing}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/50 text-purple-300 rounded-lg hover:from-purple-500/30 hover:to-indigo-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-5 h-5" />
                <span>{polishing ? 'Polishing...' : 'Polish with LLM'}</span>
              </button>
            )}
            {hasPolishedTranslations && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg">
                <Sparkles className="w-5 h-5" />
                <span>Polished with LLM</span>
              </div>
            )}
          </div>

          {polishError && (
            <div className="mb-4 glass border border-red-500/50 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{polishError}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/50">
                <Calendar className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-sm text-slate-400">Date</div>
                <div className="font-medium text-slate-200">{formatDate(session.createdAt)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/50">
                <Clock className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="text-sm text-slate-400">Time</div>
                <div className="font-medium text-slate-200">{formatTime(session.createdAt)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/50">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-slate-400">Duration</div>
                <div className="font-medium text-slate-200">{formatDuration(session.duration)}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="text-sm text-slate-400">Total Segments</div>
            <div className="font-medium text-lg text-slate-200">{session.segmentCount}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Original Language */}
          <div className="rounded-xl overflow-hidden border border-white/5">
            <div className="glass px-6 py-4 border-b border-white/5">
              <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-500">
                Original (French)
              </h2>
            </div>
            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto bg-[#121214]">
              {session.segments.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No segments recorded</p>
              ) : (
                session.segments.map((segment) => (
                  <div key={segment.id} className="pb-4 border-b border-white/5 last:border-0">
                    <div className="text-xs text-indigo-400 mb-2 font-mono">
                      {formatTime(segment.startTime)}
                    </div>
                    <p className="text-slate-200 leading-relaxed">{segment.originalText}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Translated Language */}
          <div className="rounded-xl overflow-hidden border border-white/5">
            <div className="glass px-6 py-4 border-b border-white/5">
              <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-500">
                Translation (English)
              </h2>
            </div>
            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto bg-black/40">
              {session.segments.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No translations available</p>
              ) : (
                session.segments.map((segment) => (
                  <div key={segment.id} className="pb-4 border-b border-white/5 last:border-0">
                    <div className="text-xs text-cyan-400 mb-2 font-mono">
                      {formatTime(segment.startTime)}
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Instant Translation:</div>
                      <p className="text-slate-200 leading-relaxed">{segment.translatedText}</p>
                    </div>
                    {segment.polishedText && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-lg border border-purple-500/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <div className="text-xs font-medium text-purple-300">LLM Polished:</div>
                        </div>
                        <p className="text-slate-200 leading-relaxed">{segment.polishedText}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

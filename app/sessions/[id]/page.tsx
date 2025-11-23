'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Sparkles } from 'lucide-react';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading session...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">Error: {error || 'Session not found'}</div>
          <button
            onClick={() => router.push('/sessions')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push('/sessions')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Sessions</span>
        </button>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Session Details</h1>
            {canPolish && (
              <button
                onClick={handlePolish}
                disabled={polishing}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-5 h-5" />
                <span>{polishing ? 'Polishing...' : 'Polish with LLM'}</span>
              </button>
            )}
            {hasPolishedTranslations && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                <Sparkles className="w-5 h-5" />
                <span>Polished with LLM</span>
              </div>
            )}
          </div>

          {polishError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {polishError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">Date</div>
                <div className="font-medium">{formatDate(session.createdAt)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">Time</div>
                <div className="font-medium">{formatTime(session.createdAt)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">Duration</div>
                <div className="font-medium">{formatDuration(session.duration)}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500">Segments</div>
            <div className="font-medium text-lg">{session.segmentCount}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow">
            <div className="bg-gray-100 px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Original (French)</h2>
            </div>
            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
              {session.segments.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No segments recorded</p>
              ) : (
                session.segments.map((segment, idx) => (
                  <div key={segment.id} className="pb-4 border-b border-gray-100 last:border-0">
                    <div className="text-xs text-gray-500 mb-2">
                      {formatTime(segment.startTime)}
                    </div>
                    <p className="text-gray-900">{segment.originalText}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
              <h2 className="text-lg font-semibold text-blue-900">Translation (English)</h2>
            </div>
            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
              {session.segments.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No translations available</p>
              ) : (
                session.segments.map((segment, idx) => (
                  <div key={segment.id} className="pb-4 border-b border-gray-100 last:border-0">
                    <div className="text-xs text-blue-600 mb-2">
                      {formatTime(segment.startTime)}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Instant Translation:</div>
                      <p className="text-gray-900">{segment.translatedText}</p>
                    </div>
                    {segment.polishedText && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <div className="text-xs font-medium text-purple-700">LLM Polished:</div>
                        </div>
                        <p className="text-gray-900">{segment.polishedText}</p>
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

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Languages, ChevronRight } from 'lucide-react';

interface Session {
  id: string;
  createdAt: string;
  segments: Array<{ id: string }>;
}

export function HistoryList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sessions');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Languages className="w-16 h-16 text-slate-600" />
        <p className="text-slate-400 text-center">
          No sessions recorded yet.
          <br />
          <span className="text-sm text-slate-500">Start recording to create your first session.</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block glass rounded-xl overflow-hidden border border-white/5">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Session ID</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Date</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Segments</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr
                key={session.id}
                className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors duration-200"
              >
                <td className="px-6 py-4">
                  <code className="text-sm text-cyan-400 font-mono">
                    {session.id.slice(0, 8)}...
                  </code>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="text-sm">{formatDate(session.createdAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-300">
                    {session.segments.length} segment{session.segments.length !== 1 ? 's' : ''}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/sessions/${session.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300"
                  >
                    <span className="text-sm font-medium">View</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/sessions/${session.id}`}
            className="block card-dark p-4 hover:border-cyan-500/50 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <code className="text-xs text-cyan-400 font-mono">
                  {session.id.slice(0, 12)}...
                </code>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Clock className="w-4 h-4" />
              <span>{formatDate(session.createdAt)}</span>
            </div>
            <div className="text-sm text-slate-500">
              {session.segments.length} segment{session.segments.length !== 1 ? 's' : ''}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

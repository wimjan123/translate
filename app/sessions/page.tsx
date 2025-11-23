'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { HistoryList } from '@/components/HistoryList';

export default function SessionsPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 mb-2">
              Recording Sessions
            </h1>
            <p className="text-slate-400">View and manage your translation sessions</p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Record</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>

        <HistoryList />
      </div>
    </div>
  );
}

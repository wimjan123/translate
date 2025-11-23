'use client';

import Link from 'next/link';
import { Settings, Sparkles, Home, Database } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface NavbarProps {
  onSettingsClick: () => void;
}

export function Navbar({ onSettingsClick }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-slate-200">
              Live <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">Translation</span>
            </h1>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                pathname === '/'
                  ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                  : 'border border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Record</span>
            </Link>

            <Link
              href="/sessions"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                pathname.startsWith('/sessions')
                  ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-400'
                  : 'border border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
              }`}
            >
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">History</span>
            </Link>

            <button
              onClick={onSettingsClick}
              className="p-2 rounded-lg border border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10 transition-all duration-300"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

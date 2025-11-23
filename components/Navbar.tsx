'use client';

import Link from 'next/link';
import { Settings, Database, Home } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface NavbarProps {
  onSettingsClick: () => void;
}

export function Navbar({ onSettingsClick }: NavbarProps) {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">Live Translation</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                pathname === '/'
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Record</span>
            </Link>
            <Link
              href="/sessions"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                pathname.startsWith('/sessions')
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Database className="w-5 h-5" />
              <span className="font-medium">History</span>
            </Link>
            <button
              onClick={onSettingsClick}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

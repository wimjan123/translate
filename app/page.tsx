'use client';

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { SettingsModal } from '@/components/SettingsModal';
import { TranscriptView } from '@/components/TranscriptView';
import { LiveControls } from '@/components/LiveControls';
import { FileUpload } from '@/components/FileUpload';
import { LiveSessionProvider, useLiveSession } from '@/context/LiveSessionContext';
import { useSettings } from '@/hooks/useSettings';
import { useFileUpload } from '@/hooks/useFileUpload';
import { AlertCircle } from 'lucide-react';

function HomeContent() {
  const { settings, updateSettings, isValid, isLoaded } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mode, setMode] = useState<'live' | 'upload'>('live');

  // Live mode from context
  const { error: liveError } = useLiveSession();

  // Upload mode hooks
  const {
    isUploading,
    segments: uploadSegments,
    error: uploadError,
    uploadFile,
    clearSegments,
  } = useFileUpload(settings);

  // Show loading state while settings load
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // Show setup prompt if keys are missing
  if (!isValid) {
    return (
      <div className="min-h-screen">
        <Navbar onSettingsClick={() => setIsSettingsOpen(true)} />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="glass border border-amber-500/50 rounded-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-amber-400" />
            <h2 className="text-2xl font-bold text-amber-300 mb-4">Setup Required</h2>
            <p className="text-slate-300 mb-6">
              Please configure your API keys in Settings to get started.
            </p>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-6 py-3 bg-amber-500/20 border border-amber-500/50 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-all duration-300"
            >
              Open Settings
            </button>
          </div>
        </div>
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={updateSettings}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar onSettingsClick={() => setIsSettingsOpen(true)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode Toggle */}
        <div className="flex gap-2 mb-8 border-b border-white/5">
          <button
            onClick={() => setMode('live')}
            className={`px-6 py-3 font-medium transition-all duration-300 ${
              mode === 'live'
                ? 'border-b-2 border-cyan-400 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Stream
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`px-6 py-3 font-medium transition-all duration-300 ${
              mode === 'upload'
                ? 'border-b-2 border-indigo-400 text-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            File Upload
          </button>
        </div>

        {/* Error Display */}
        {(liveError || uploadError) && (
          <div className="mb-6 glass border border-red-500/50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300">{liveError || uploadError}</p>
            </div>
          </div>
        )}

        {/* Live Mode */}
        {mode === 'live' && (
          <div className="space-y-6">
            <LiveControls />
            <TranscriptView />
          </div>
        )}

        {/* Upload Mode */}
        {mode === 'upload' && (
          <div className="space-y-6">
            <FileUpload onFileSelect={uploadFile} isUploading={isUploading} />
            {uploadSegments.length > 0 && (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={clearSegments}
                    className="px-4 py-2 border border-white/10 rounded-lg text-slate-400 hover:text-slate-200 hover:border-white/20 transition-all duration-300"
                  >
                    Clear Results
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Original Language */}
                  <div className="rounded-xl overflow-hidden border border-white/5">
                    <div className="glass px-4 py-3 border-b border-white/5">
                      <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-500">
                        {settings.inputLang.toUpperCase()} (Original)
                      </h2>
                    </div>
                    <div className="h-96 overflow-y-auto p-4 space-y-3 bg-[#121214]">
                      {uploadSegments.map((segment, idx) => (
                        <div key={idx} className="pb-3 border-b border-white/5 last:border-0">
                          <p className="text-slate-200 leading-relaxed">{segment.originalText}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Translated Language */}
                  <div className="rounded-xl overflow-hidden border border-white/5">
                    <div className="glass px-4 py-3 border-b border-white/5">
                      <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-500">
                        {settings.outputLang.toUpperCase()} (Translation)
                      </h2>
                    </div>
                    <div className="h-96 overflow-y-auto p-4 space-y-3 bg-black/40">
                      {uploadSegments.map((segment, idx) => (
                        <div key={idx} className="pb-3 border-b border-white/5 last:border-0">
                          <p className="text-slate-200 leading-relaxed">
                            {segment.rawTranslation || 'Translating...'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={updateSettings}
      />
    </div>
  );
}

export default function Home() {
  const { settings, isLoaded } = useSettings();

  // Don't render provider until settings are loaded
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <LiveSessionProvider settings={settings}>
      <HomeContent />
    </LiveSessionProvider>
  );
}

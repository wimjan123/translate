'use client';

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { SettingsModal } from '@/components/SettingsModal';
import { TranscriptView } from '@/components/TranscriptView';
import { LiveControls } from '@/components/LiveControls';
import { FileUpload } from '@/components/FileUpload';
import { useSettings } from '@/hooks/useSettings';
import { useAudioStream } from '@/hooks/useAudioStream';
import { useFileUpload } from '@/hooks/useFileUpload';

export default function Home() {
  const { settings, updateSettings, isValid, isLoaded } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mode, setMode] = useState<'live' | 'upload'>('live');

  // Live mode hooks
  const {
    isConnected,
    isRecording,
    transcripts,
    error: streamError,
    startRecording,
    stopRecording,
    clearTranscripts,
  } = useAudioStream(settings);

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
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Show setup prompt if keys are missing
  if (!isValid) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onSettingsClick={() => setIsSettingsOpen(true)} />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-yellow-900 mb-4">Setup Required</h2>
            <p className="text-yellow-800 mb-6">
              Please configure your API keys in Settings to get started.
            </p>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
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
    <div className="min-h-screen bg-gray-50">
      <Navbar onSettingsClick={() => setIsSettingsOpen(true)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setMode('live')}
            className={`px-6 py-3 font-medium transition-colors ${
              mode === 'live'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Live Stream
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`px-6 py-3 font-medium transition-colors ${
              mode === 'upload'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            File Upload
          </button>
        </div>

        {/* Error Display */}
        {(streamError || uploadError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{streamError || uploadError}</p>
          </div>
        )}

        {/* Live Mode */}
        {mode === 'live' && (
          <div className="space-y-6">
            <LiveControls
              isConnected={isConnected}
              isRecording={isRecording}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onClear={clearTranscripts}
            />
            <TranscriptView
              segments={transcripts}
              inputLang={settings.inputLang}
              outputLang={settings.outputLang}
            />
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
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Clear Results
                  </button>
                </div>
                <TranscriptView
                  segments={uploadSegments}
                  inputLang={settings.inputLang}
                  outputLang={settings.outputLang}
                />
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

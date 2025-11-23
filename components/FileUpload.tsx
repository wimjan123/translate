'use client';

import { useCallback, useState } from 'react';
import { Upload, FileAudio, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
}

export function FileUpload({ onFileSelect, isUploading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find((f) =>
      f.type.startsWith('audio/') || f.name.match(/\.(mp3|wav|m4a|webm|ogg)$/i)
    );

    if (audioFile) {
      setSelectedFile(audioFile);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300
          ${
            isDragging
              ? 'border-cyan-400/50 bg-cyan-500/10'
              : 'border-white/10 bg-black/20'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-white/20'}
        `}
      >
        <Upload
          className={`w-16 h-16 mx-auto mb-4 transition-colors duration-300 ${
            isDragging ? 'text-cyan-400' : 'text-slate-500'
          }`}
        />
        <p className="text-lg font-medium text-slate-200 mb-2">
          Drop audio file here or click to browse
        </p>
        <p className="text-sm text-slate-400 mb-4">
          Supports: MP3, WAV, M4A, WebM, OGG
        </p>
        <input
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
          onChange={handleFileInput}
          className="hidden"
          id="file-input"
          disabled={isUploading}
        />
        <label
          htmlFor="file-input"
          className="inline-block px-6 py-3 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg cursor-pointer hover:bg-cyan-500/30 transition-all duration-300"
        >
          Browse Files
        </label>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between p-4 card-dark">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/50">
              <FileAudio className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="font-medium text-slate-200">{selectedFile.name}</p>
              <p className="text-sm text-slate-400">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              {isUploading ? 'Processing...' : 'Upload & Translate'}
            </button>
            <button
              onClick={handleClear}
              disabled={isUploading}
              className="p-2 hover:bg-white/5 rounded-lg transition-all duration-300 disabled:opacity-50"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

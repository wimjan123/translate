'use client';

import { useState } from 'react';
import axios from 'axios';
import type { AppSettings, TranscriptSegment } from '@/src/types/settings';

export function useFileUpload(settings: AppSettings) {
  const [isUploading, setIsUploading] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    if (!settings.deepgramKey || !settings.openRouterKey) {
      setError('Missing API keys');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/upload', formData, {
        headers: {
          'x-deepgram-key': settings.deepgramKey,
          'x-deepgram-model': settings.deepgramModel,
          'x-openrouter-key': settings.openRouterKey,
          'x-openrouter-model': settings.openRouterModel,
          'x-input-lang': settings.inputLang,
          'x-output-lang': settings.outputLang,
        },
      });

      setSegments(response.data.segments);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const clearSegments = () => {
    setSegments([]);
  };

  return {
    isUploading,
    segments,
    error,
    uploadFile,
    clearSegments,
  };
}

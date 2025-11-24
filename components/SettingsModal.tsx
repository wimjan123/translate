'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { AppSettings } from '@/src/types/settings';
import { fetchOpenRouterModels, groupModelsByProvider, type OpenRouterModel } from '@/src/lib/openrouter-models';
import axios from 'axios';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [formData, setFormData] = useState(settings);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState<'deepgram' | 'openrouter' | null>(null);
  const [connectionResults, setConnectionResults] = useState<{
    deepgram?: { success: boolean; message: string };
    openrouter?: { success: boolean; message: string };
  }>({});

  // Fetch OpenRouter models on component mount
  useEffect(() => {
    fetchOpenRouterModels()
      .then((fetchedModels) => {
        setModels(fetchedModels);
        setModelsError(null);
      })
      .catch((error) => {
        console.error('Failed to fetch models:', error);
        setModelsError('Failed to load models');
      })
      .finally(() => {
        setLoadingModels(false);
      });
  }, []);

  if (!isOpen) return null;

  const testDeepgramConnection = async () => {
    setTestingConnection('deepgram');
    setConnectionResults((prev) => ({ ...prev, deepgram: undefined }));

    try {
      const response = await axios.post(
        'https://api.deepgram.com/v1/listen',
        new ArrayBuffer(0),
        {
          headers: {
            Authorization: `Token ${formData.deepgramKey}`,
            'Content-Type': 'audio/wav',
          },
        }
      );

      setConnectionResults((prev) => ({
        ...prev,
        deepgram: { success: true, message: 'Deepgram API key is valid!' },
      }));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setConnectionResults((prev) => ({
          ...prev,
          deepgram: { success: false, message: 'Invalid Deepgram API key' },
        }));
      } else if (axios.isAxiosError(error) && error.response?.status === 400) {
        // 400 means auth passed but request was bad (expected)
        setConnectionResults((prev) => ({
          ...prev,
          deepgram: { success: true, message: 'Deepgram API key is valid!' },
        }));
      } else {
        setConnectionResults((prev) => ({
          ...prev,
          deepgram: { success: false, message: 'Failed to verify Deepgram connection' },
        }));
      }
    } finally {
      setTestingConnection(null);
    }
  };

  const testOpenRouterConnection = async () => {
    setTestingConnection('openrouter');
    setConnectionResults((prev) => ({ ...prev, openrouter: undefined }));

    try {
      // Make a minimal test completion request to validate the API key
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: formData.openRouterModel || 'google/gemini-flash-1.5',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        },
        {
          headers: {
            Authorization: `Bearer ${formData.openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://translation.polibase.nl',
          },
        }
      );

      setConnectionResults((prev) => ({
        ...prev,
        openrouter: { success: true, message: 'OpenRouter API key is valid!' },
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorData = error.response?.data;

        if (status === 401 || status === 403) {
          setConnectionResults((prev) => ({
            ...prev,
            openrouter: { success: false, message: 'Invalid OpenRouter API key' },
          }));
        } else if (errorData?.error?.message) {
          setConnectionResults((prev) => ({
            ...prev,
            openrouter: { success: false, message: `Error: ${errorData.error.message}` },
          }));
        } else {
          setConnectionResults((prev) => ({
            ...prev,
            openrouter: { success: false, message: `Failed to verify connection (Status: ${status})` },
          }));
        }
      } else {
        setConnectionResults((prev) => ({
          ...prev,
          openrouter: { success: false, message: 'Failed to verify OpenRouter connection' },
        }));
      }
    } finally {
      setTestingConnection(null);
    }
  };

  const handleSave = () => {
    // Trim all API keys to remove whitespace
    const trimmedData = {
      ...formData,
      deepgramKey: formData.deepgramKey.trim(),
      openRouterKey: formData.openRouterKey.trim(),
    };

    onSave(trimmedData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="glass border border-white/10 rounded-t-2xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-all duration-300"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Deepgram Settings */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-3">Deepgram (Speech-to-Text)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">API Key</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={formData.deepgramKey}
                    onChange={(e) => setFormData({ ...formData, deepgramKey: e.target.value })}
                    className="flex-1 px-4 py-2 input-dark rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
                    placeholder="Enter Deepgram API key"
                  />
                  <button
                    onClick={testDeepgramConnection}
                    disabled={!formData.deepgramKey || testingConnection === 'deepgram'}
                    className="px-4 py-2 bg-indigo-500/20 border border-indigo-500/50 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {testingConnection === 'deepgram' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test'
                    )}
                  </button>
                </div>
                {connectionResults.deepgram && (
                  <div className={`mt-2 flex items-center gap-2 text-sm ${connectionResults.deepgram.success ? 'text-green-400' : 'text-red-400'}`}>
                    {connectionResults.deepgram.success ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {connectionResults.deepgram.message}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Model</label>
                <select
                  value={formData.deepgramModel}
                  onChange={(e) => setFormData({ ...formData, deepgramModel: e.target.value })}
                  className="w-full px-4 py-2 input-dark rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
                >
                  <option value="nova-3">Nova 3 (Latest & Best)</option>
                  <option value="nova-2">Nova 2</option>
                  <option value="nova-2-general">Nova 2 General</option>
                  <option value="whisper-large">Whisper Large</option>
                </select>
              </div>
            </div>
          </div>

          {/* OpenRouter Settings */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-3">OpenRouter (Translation)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">API Key</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={formData.openRouterKey}
                    onChange={(e) => setFormData({ ...formData, openRouterKey: e.target.value })}
                    className="flex-1 px-4 py-2 input-dark rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
                    placeholder="sk-or-v1-..."
                  />
                  <button
                    onClick={testOpenRouterConnection}
                    disabled={!formData.openRouterKey || testingConnection === 'openrouter'}
                    className="px-4 py-2 bg-indigo-500/20 border border-indigo-500/50 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {testingConnection === 'openrouter' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test'
                    )}
                  </button>
                </div>
                {connectionResults.openrouter && (
                  <div className={`mt-2 flex items-center gap-2 text-sm ${connectionResults.openrouter.success ? 'text-green-400' : 'text-red-400'}`}>
                    {connectionResults.openrouter.success ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {connectionResults.openrouter.message}
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  Get your API key from{' '}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline"
                  >
                    openrouter.ai/keys
                  </a>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Model</label>
                <select
                  value={formData.openRouterModel}
                  onChange={(e) => setFormData({ ...formData, openRouterModel: e.target.value })}
                  className="w-full px-4 py-2 input-dark rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
                  disabled={loadingModels}
                >
                  {loadingModels ? (
                    <option>Loading models...</option>
                  ) : modelsError ? (
                    <>
                      <option value="google/gemini-flash-1.5">Gemini Flash 1.5 (Fast)</option>
                      <option value="meta-llama/llama-3.1-8b-instruct">Llama 3.1 8B</option>
                      <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
                    </>
                  ) : (
                    Object.entries(groupModelsByProvider(models)).map(([provider, providerModels]) => (
                      <optgroup key={provider} label={provider}>
                        {providerModels.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))}
                      </optgroup>
                    ))
                  )}
                </select>
                {modelsError && (
                  <p className="text-sm text-amber-400 mt-2">
                    Failed to load models. Showing fallback options.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Language Settings */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-3">Languages</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Input Language</label>
                <select
                  value={formData.inputLang}
                  onChange={(e) => setFormData({ ...formData, inputLang: e.target.value })}
                  className="w-full px-4 py-2 input-dark rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                >
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Output Language</label>
                <select
                  value={formData.outputLang}
                  onChange={(e) => setFormData({ ...formData, outputLang: e.target.value })}
                  className="w-full px-4 py-2 input-dark rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
                >
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          </div>

          {/* Translation Options */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-3">Translation Options</h3>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 transition-all duration-300">
                <input
                  type="checkbox"
                  checked={formData.enablePolishing}
                  onChange={(e) => setFormData({ ...formData, enablePolishing: e.target.checked })}
                  className="mt-1 w-4 h-4 text-cyan-500 bg-black/40 border-white/10 rounded focus:ring-2 focus:ring-cyan-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-200">Enable LLM Polishing</span>
                  <p className="text-xs text-slate-400 mt-1">
                    Polish translations using LLM for better grammar and naturalness (slower, costs API calls)
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-white/5 bg-black/20">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-white/10 rounded-lg text-slate-400 hover:text-slate-200 hover:border-white/20 transition-all duration-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all duration-300"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

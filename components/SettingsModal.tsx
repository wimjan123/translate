'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { AppSettings } from '@/src/types/settings';
import { fetchOpenRouterModels, groupModelsByProvider, type OpenRouterModel } from '@/src/lib/openrouter-models';

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

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Deepgram Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Deepgram (Speech-to-Text)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">API Key</label>
                <input
                  type="password"
                  value={formData.deepgramKey}
                  onChange={(e) => setFormData({ ...formData, deepgramKey: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Deepgram API key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select
                  value={formData.deepgramModel}
                  onChange={(e) => setFormData({ ...formData, deepgramModel: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
            <h3 className="text-lg font-semibold mb-3">OpenRouter (Translation)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">API Key</label>
                <input
                  type="password"
                  value={formData.openRouterKey}
                  onChange={(e) => setFormData({ ...formData, openRouterKey: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter OpenRouter API key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select
                  value={formData.openRouterModel}
                  onChange={(e) => setFormData({ ...formData, openRouterModel: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  <p className="text-sm text-amber-600 mt-1">
                    Failed to load models. Showing fallback options.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Language Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Languages</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Input Language</label>
                <select
                  value={formData.inputLang}
                  onChange={(e) => setFormData({ ...formData, inputLang: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Output Language</label>
                <select
                  value={formData.outputLang}
                  onChange={(e) => setFormData({ ...formData, outputLang: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
            <h3 className="text-lg font-semibold mb-3">Translation Options</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enablePolishing}
                  onChange={(e) => setFormData({ ...formData, enablePolishing: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium">Enable LLM Polishing</span>
                  <p className="text-xs text-gray-500">
                    Polish translations using LLM for better grammar and naturalness (slower, costs API calls)
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

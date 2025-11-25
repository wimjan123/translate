'use client';

import { ArrowLeftRight } from 'lucide-react';
import { INPUT_LANGUAGES } from '@/src/lib/language-config';

interface TwoWayLanguageSelectorProps {
  languageA: string;
  languageB: string;
  onChangeLanguageA: (lang: string) => void;
  onChangeLanguageB: (lang: string) => void;
  disabled?: boolean;
}

export function TwoWayLanguageSelector({
  languageA,
  languageB,
  onChangeLanguageA,
  onChangeLanguageB,
  disabled = false,
}: TwoWayLanguageSelectorProps) {
  // Swap languages
  const handleSwap = () => {
    if (disabled) return;
    const tempA = languageA;
    onChangeLanguageA(languageB);
    onChangeLanguageB(tempA);
  };

  return (
    <div className="flex items-center justify-center gap-4 mb-6">
      <div className="flex flex-col">
        <label className="text-xs text-slate-400 mb-1 text-center">Language A</label>
        <select
          value={languageA}
          onChange={(e) => onChangeLanguageA(e.target.value)}
          disabled={disabled}
          className="px-4 py-2 input-dark rounded-lg text-slate-200 bg-[#1a1a1c] border border-white/10 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {INPUT_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleSwap}
        disabled={disabled}
        className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors mt-5 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Swap languages"
      >
        <ArrowLeftRight className="w-5 h-5" />
      </button>

      <div className="flex flex-col">
        <label className="text-xs text-slate-400 mb-1 text-center">Language B</label>
        <select
          value={languageB}
          onChange={(e) => onChangeLanguageB(e.target.value)}
          disabled={disabled}
          className="px-4 py-2 input-dark rounded-lg text-slate-200 bg-[#1a1a1c] border border-white/10 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {INPUT_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

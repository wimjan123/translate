export interface Language {
  code: string;
  label: string;
  deepgramCode?: string; // If different from standard code
  libreTranslateCode?: string; // If different from standard code
}

// Input languages (for speech-to-text)
export const INPUT_LANGUAGES: Language[] = [
  { code: 'fr', label: 'French' },
  { code: 'nl', label: 'Dutch' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'zh', label: 'Chinese', deepgramCode: 'zh-CN' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'en', label: 'English' }, // Can also be used as input
];

// Output languages (for translation target)
export const OUTPUT_LANGUAGES: Language[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'nl', label: 'Dutch' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'zh', label: 'Chinese', libreTranslateCode: 'zh' },
  { code: 'ja', label: 'Japanese' },
];

// Deepgram language code mapping
export const getDeepgramLanguageCode = (code: string): string => {
  const lang = INPUT_LANGUAGES.find(l => l.code === code);
  return lang?.deepgramCode || code;
};

// LibreTranslate language code mapping
export const getLibreTranslateLanguageCode = (code: string): string => {
  const lang = [...INPUT_LANGUAGES, ...OUTPUT_LANGUAGES].find(l => l.code === code);
  return lang?.libreTranslateCode || code;
};

// Language names for display
export const getLanguageName = (code: string): string => {
  const lang = [...INPUT_LANGUAGES, ...OUTPUT_LANGUAGES].find(l => l.code === code);
  return lang?.label || code.toUpperCase();
};

// Validate language pair support
export const isLanguagePairSupported = (inputCode: string, outputCode: string): boolean => {
  const inputSupported = INPUT_LANGUAGES.some(l => l.code === inputCode);
  const outputSupported = OUTPUT_LANGUAGES.some(l => l.code === outputCode);
  return inputSupported && outputSupported;
};

// Get language options for dropdowns
export const getLanguageOptions = (type: 'input' | 'output'): Array<{ value: string; label: string }> => {
  const languages = type === 'input' ? INPUT_LANGUAGES : OUTPUT_LANGUAGES;
  return languages.map(lang => ({
    value: lang.code,
    label: lang.label
  }));
};

// Default language settings
export const DEFAULT_INPUT_LANGUAGE = 'fr'; // French
export const DEFAULT_OUTPUT_LANGUAGE = 'en'; // English

// Polishing settings defaults
export const DEFAULT_POLISHING_SETTINGS = {
  enableLivePolishing: false,
  polishingInterval: 30, // seconds
  polishingBatchSize: 5, // minimum segments
};

// Model settings defaults
export const DEFAULT_DEEPGRAM_MODEL = 'nova-3';
export const DEFAULT_OPENROUTER_MODEL = 'google/gemini-flash-1.5';

// LibreTranslate language support
// Note: This should match the languages loaded in the Docker container
export const LIBRETRANSLATE_LANGUAGES = [
  'en', 'fr', 'nl', 'es', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ar'
];

// Check if LibreTranslate supports a language pair
export const isLibreTranslateSupported = (sourceLang: string, targetLang: string): boolean => {
  const source = getLibreTranslateLanguageCode(sourceLang);
  const target = getLibreTranslateLanguageCode(targetLang);
  return LIBRETRANSLATE_LANGUAGES.includes(source) && LIBRETRANSLATE_LANGUAGES.includes(target);
};
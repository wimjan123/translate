export interface AppSettings {
  // Deepgram Configuration
  deepgramKey: string;
  deepgramModel: string; // e.g., 'nova-2', 'nova-2-general', 'whisper-large'

  // OpenRouter Configuration
  openRouterKey: string;
  openRouterModel: string; // e.g., 'google/gemini-flash-1.5', 'meta-llama/llama-3.1-8b-instruct'

  // Language Configuration
  inputLang: string;  // e.g., 'fr', 'es', 'de'
  outputLang: string; // e.g., 'en', 'fr', 'es'

  // Translation Options
  enablePolishing: boolean; // Enable LLM polishing of instant translations
}

export const DEFAULT_SETTINGS: AppSettings = {
  deepgramKey: '',
  deepgramModel: 'nova-3',
  openRouterKey: '',
  openRouterModel: 'google/gemini-flash-1.5',
  inputLang: 'fr',
  outputLang: 'en',
  enablePolishing: false,
};

// Socket.io handshake auth type
export interface SocketAuth {
  deepgramKey: string;
  deepgramModel: string;
  openRouterKey: string;
  openRouterModel: string;
  inputLang: string;
  outputLang: string;
  enablePolishing: boolean;
}

// Transcript segment type (matches Prisma schema)
export interface TranscriptSegment {
  startOffsetMs: number;
  endOffsetMs: number;
  originalText: string;
  translatedText: string;
  isFinal: boolean;
}

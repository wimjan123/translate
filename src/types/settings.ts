export interface AppSettings {
  // Deepgram Configuration
  deepgramKey: string;
  deepgramModel: string; // e.g., 'nova-2', 'nova-3', 'whisper-large'

  // OpenRouter Configuration
  openRouterKey: string;
  openRouterModel: string; // e.g., 'google/gemini-flash-1.5', 'meta-llama/llama-3.1-8b-instruct'

  // Language Configuration
  inputLang: string;  // e.g., 'fr', 'nl', 'es', 'de'
  outputLang: string; // e.g., 'en', 'fr', 'nl', 'es'

  // Live Polishing Settings
  enableLivePolishing: boolean; // Enable background polishing during live transcription
  polishingInterval: number;    // Interval in seconds (10-120)
  polishingBatchSize: number;   // Minimum segments before polishing (3-10)
}

export const DEFAULT_SETTINGS: AppSettings = {
  deepgramKey: '',
  deepgramModel: 'nova-3',
  openRouterKey: '',
  openRouterModel: 'google/gemini-flash-1.5',
  inputLang: 'fr',
  outputLang: 'en',
  enableLivePolishing: false,
  polishingInterval: 30, // 30 seconds default
  polishingBatchSize: 5,  // 5 segments minimum
};

// Socket.io handshake auth type
export interface SocketAuth {
  deepgramKey: string;
  deepgramModel: string;
  openRouterKey: string;
  openRouterModel: string;
  inputLang: string;
  outputLang: string;
  enableLivePolishing: boolean;
  polishingInterval: number;
  polishingBatchSize: number;
}

// Transcript segment type (matches Prisma schema)
export interface TranscriptSegment {
  startOffsetMs: number;
  endOffsetMs: number;
  originalText: string;
  rawTranslation?: string;  // LibreTranslate instant translation
  polishedTranslation?: string;  // OpenRouter LLM polished translation
  isFinal: boolean;
}

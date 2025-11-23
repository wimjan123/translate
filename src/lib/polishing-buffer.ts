import { translateText } from './openrouter-client';

interface BufferedSegment {
  originalText: string;
  instantTranslation: string;
  timestamp: number;
}

export class PolishingBuffer {
  private buffer: BufferedSegment[] = [];
  private readonly maxSegments: number = 5;
  private readonly maxWaitMs: number = 10000; // 10 seconds
  private flushTimer: NodeJS.Timeout | null = null;
  private onPolishedCallback: ((polished: string, segments: BufferedSegment[]) => void) | null = null;

  constructor(
    private apiKey: string,
    private model: string,
    private sourceLang: string,
    private targetLang: string
  ) {}

  setOnPolished(callback: (polished: string, segments: BufferedSegment[]) => void) {
    this.onPolishedCallback = callback;
  }

  add(originalText: string, instantTranslation: string): void {
    this.buffer.push({
      originalText,
      instantTranslation,
      timestamp: Date.now(),
    });

    console.log(`Polishing buffer: Added segment (${this.buffer.length}/${this.maxSegments})`);

    // Reset timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    // Check if we should flush
    if (this.buffer.length >= this.maxSegments) {
      console.log('Polishing buffer: Flushing (max segments reached)');
      this.flush();
    } else {
      // Set timer to flush after maxWaitMs
      this.flushTimer = setTimeout(() => {
        if (this.buffer.length > 0) {
          console.log('Polishing buffer: Flushing (timeout reached)');
          this.flush();
        }
      }, this.maxWaitMs);
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const segmentsToPolish = [...this.buffer];
    this.buffer = [];

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    try {
      // Combine instant translations
      const combinedText = segmentsToPolish
        .map(s => s.instantTranslation)
        .join(' ');

      console.log('Polishing buffer: Sending to LLM for polishing:', combinedText);

      // Polish using LLM
      const polishedText = await translateText({
        text: combinedText,
        sourceLang: this.targetLang, // Already translated, just polishing
        targetLang: this.targetLang,
        model: this.model,
        apiKey: this.apiKey,
        isPolishing: true,
      });

      console.log('Polishing buffer: Received polished text:', polishedText);

      if (this.onPolishedCallback) {
        this.onPolishedCallback(polishedText, segmentsToPolish);
      }
    } catch (error) {
      console.error('Polishing buffer: Error during polishing:', error);
      // Don't throw - just log the error and continue
    }
  }

  clear(): void {
    this.buffer = [];
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

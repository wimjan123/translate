// Buffers Deepgram transcripts until we hit punctuation, then translates
export class TranslationBuffer {
  private buffer: string[] = [];
  private readonly punctuationRegex = /[.!?。！？]/;

  add(text: string, isFinal: boolean): { shouldTranslate: boolean; bufferedText: string } {
    if (!isFinal) {
      return { shouldTranslate: false, bufferedText: '' };
    }

    this.buffer.push(text);
    const combined = this.buffer.join(' ');

    // Check if we have punctuation
    if (this.punctuationRegex.test(combined)) {
      const toTranslate = combined;
      this.buffer = [];
      return { shouldTranslate: true, bufferedText: toTranslate };
    }

    return { shouldTranslate: false, bufferedText: '' };
  }

  clear() {
    this.buffer = [];
  }

  flush(): string {
    const text = this.buffer.join(' ');
    this.buffer = [];
    return text;
  }
}

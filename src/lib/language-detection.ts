/**
 * Language detection utility for 2-way live translation mode.
 * Analyzes per-word language tags from Deepgram's multilingual transcription.
 */

interface WordWithLanguage {
  word: string;
  language?: string;
  confidence?: number;
}

interface DetectionResult {
  language: string;
  other: string;
  confidence: number;
}

/**
 * Normalize BCP-47 language codes to simple 2-letter codes.
 * Examples: 'nl-NL' -> 'nl', 'fr-FR' -> 'fr', 'zh-CN' -> 'zh'
 */
export function normalizeLanguageCode(bcp47Code: string): string {
  if (!bcp47Code) return '';
  return bcp47Code.split('-')[0].toLowerCase();
}

/**
 * Detect the dominant language from Deepgram's per-word language tags.
 * Only considers words tagged as languageA or languageB.
 *
 * @param words - Array of words with language tags from Deepgram
 * @param languageA - First language in the 2-way pair (e.g., 'nl')
 * @param languageB - Second language in the 2-way pair (e.g., 'fr')
 * @returns The dominant language, the other language, and confidence score
 */
export function detectDominantLanguage(
  words: WordWithLanguage[],
  languageA: string,
  languageB: string
): DetectionResult {
  const counts: Record<string, number> = { [languageA]: 0, [languageB]: 0 };

  for (const word of words) {
    if (!word.language) continue;

    const normalized = normalizeLanguageCode(word.language);

    if (normalized === languageA) {
      counts[languageA]++;
    } else if (normalized === languageB) {
      counts[languageB]++;
    }
  }

  const total = counts[languageA] + counts[languageB];

  // Default to languageA if no words detected
  if (total === 0) {
    return {
      language: languageA,
      other: languageB,
      confidence: 0
    };
  }

  const dominant = counts[languageA] >= counts[languageB] ? languageA : languageB;
  const other = dominant === languageA ? languageB : languageA;
  const confidence = Math.max(counts[languageA], counts[languageB]) / total;

  return {
    language: dominant,
    other,
    confidence
  };
}

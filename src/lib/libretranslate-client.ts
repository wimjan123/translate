interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

interface TranslateResponse {
  translatedText: string;
}

const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || 'http://libretranslate:5000';

// Simple in-memory cache for common translations
const translationCache = new Map<string, string>();

function getCacheKey(text: string, sourceLang: string, targetLang: string): string {
  return `${sourceLang}:${targetLang}:${text}`;
}

export async function translateWithLibreTranslate({
  text,
  sourceLang,
  targetLang,
}: TranslateRequest): Promise<string> {
  if (!text || text.trim().length === 0) {
    return '';
  }

  // Check cache first
  const cacheKey = getCacheKey(text, sourceLang, targetLang);
  const cached = translationCache.get(cacheKey);
  if (cached) {
    console.log('LibreTranslate: Using cached translation');
    return cached;
  }

  try {
    console.log(`LibreTranslate: Translating "${text}" from ${sourceLang} to ${targetLang}`);

    const response = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text',
      }),
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate API error: ${response.status}`);
    }

    const data: TranslateResponse = await response.json();

    // Cache the result
    translationCache.set(cacheKey, data.translatedText);

    // Limit cache size to prevent memory issues
    if (translationCache.size > 1000) {
      const firstKey = translationCache.keys().next().value;
      if (firstKey) {
        translationCache.delete(firstKey);
      }
    }

    console.log(`LibreTranslate: Translated to "${data.translatedText}"`);
    return data.translatedText;
  } catch (error) {
    console.error('LibreTranslate error:', error);
    throw new Error('Instant translation failed');
  }
}

export async function checkLibreTranslateHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${LIBRETRANSLATE_URL}/languages`);
    return response.ok;
  } catch (error) {
    console.error('LibreTranslate health check failed:', error);
    return false;
  }
}

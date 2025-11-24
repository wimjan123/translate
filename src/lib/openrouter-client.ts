import axios from 'axios';

export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  model: string;
  apiKey: string;
  isPolishing?: boolean;
  isBatch?: boolean;
}

export async function translateText(request: TranslationRequest): Promise<string> {
  const { text, sourceLang, targetLang, model, apiKey, isPolishing = false, isBatch = false } = request;

  let prompt: string;

  if (isBatch && isPolishing) {
    // Batch polishing mode - maintain segment structure with full context
    prompt = `Polish the following ${sourceLang} to ${targetLang} translation segments to improve quality, natural flow, and readability.

CRITICAL INSTRUCTIONS:
1. MAINTAIN ALL segment markers EXACTLY as shown: [SEGMENT_N] and [END_SEGMENT_N]
2. Polish each segment considering the FULL CONTEXT of all segments for consistency
3. Ensure consistent tone, terminology, and style across ALL segments
4. Improve grammar, naturalness, and flow while preserving the original meaning
5. Return ALL segments with the SAME marker structure - do not skip any segments
6. Output ONLY the polished segments with markers, no explanations or additional text

Input segments:
${text}`;
  } else if (isPolishing) {
    prompt = `Translate the following ${sourceLang} text to ${targetLang} with high quality, natural phrasing, proper grammar, and excellent flow. Maintain the original meaning and nuance. Only output the translation, no explanations:\n\n${text}`;
  } else {
    prompt = `Translate the following ${sourceLang} text to ${targetLang}. Only output the translation, no explanations:\n\n${text}`;
  }

  console.log('OpenRouter request:', {
    model,
    apiKeyPrefix: apiKey.substring(0, 15) + '...',
    apiKeyLength: apiKey.length,
    isPolishing,
    textLength: text.length
  });

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [
          { role: 'user', content: prompt }
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://translation.polibase.nl',
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Translation error:', error);

    // Extract meaningful error message from API response
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      const apiError = error.response?.data?.error?.message || error.response?.data?.error || error.message;
      const statusCode = error.response?.status;

      if (statusCode === 401 || statusCode === 403) {
        throw new Error('Invalid API key. Please check your OpenRouter API key in Settings.');
      }

      if (apiError) {
        throw new Error(`OpenRouter API error: ${apiError}`);
      }
    }

    throw new Error('Translation failed. Please check your API key and try again.');
  }
}

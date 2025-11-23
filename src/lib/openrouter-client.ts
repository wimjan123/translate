import axios from 'axios';

export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  model: string;
  apiKey: string;
  isPolishing?: boolean;
}

export async function translateText(request: TranslationRequest): Promise<string> {
  const { text, sourceLang, targetLang, model, apiKey, isPolishing = false } = request;

  const prompt = isPolishing
    ? `Polish and improve the following ${targetLang} text for better grammar, naturalness, and flow. Maintain the original meaning. Only output the polished text, no explanations:\n\n${text}`
    : `Translate the following ${sourceLang} text to ${targetLang}. Only output the translation, no explanations:\n\n${text}`;

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
    throw new Error('Translation failed');
  }
}

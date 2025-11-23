export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  provider?: string;
}

const CACHE_KEY = 'openrouter-models-cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CachedModels {
  models: OpenRouterModel[];
  timestamp: number;
}

export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  // Check cache first
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { models, timestamp }: CachedModels = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;

        if (!isExpired) {
          console.log('Using cached OpenRouter models');
          return models;
        }
      } catch (error) {
        console.error('Failed to parse cached models:', error);
      }
    }
  }

  // Fetch from API
  try {
    console.log('Fetching OpenRouter models from API...');
    const response = await fetch('https://openrouter.ai/api/v1/models');

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();

    // Parse and simplify model data
    const models: OpenRouterModel[] = data.data.map((model: any) => {
      // Extract provider from model ID (e.g., "google/gemini-flash-1.5" -> "Google")
      const provider = model.id.split('/')[0];
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

      return {
        id: model.id,
        name: model.name || model.id,
        description: model.description,
        provider: providerName,
      };
    });

    // Cache the results
    if (typeof window !== 'undefined') {
      const cacheData: CachedModels = {
        models,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    }

    console.log(`Fetched ${models.length} models from OpenRouter`);
    return models;
  } catch (error) {
    console.error('Failed to fetch OpenRouter models:', error);
    throw error;
  }
}

export function groupModelsByProvider(models: OpenRouterModel[]): Record<string, OpenRouterModel[]> {
  const grouped: Record<string, OpenRouterModel[]> = {};

  models.forEach(model => {
    const provider = model.provider || 'Other';
    if (!grouped[provider]) {
      grouped[provider] = [];
    }
    grouped[provider].push(model);
  });

  // Sort providers alphabetically
  return Object.keys(grouped)
    .sort()
    .reduce((acc, key) => {
      acc[key] = grouped[key];
      return acc;
    }, {} as Record<string, OpenRouterModel[]>);
}

import { getDefaultProvider } from '../../integrations/llm';
import { createChildLogger } from '../../utils/logger';

const logger = createChildLogger('ToplistContentTranslator');

// In-memory cache for translations (per session)
const translationCache = new Map<string, string>();

interface TranslationBatch {
  [key: string]: string;
}

/**
 * Translates toplist content (bonus text, terms, CTAs) to the target language.
 * Uses LLM for natural translation that maintains marketing/promotional tone.
 */
export async function translateToplistContent(
  texts: TranslationBatch,
  targetLanguage: string
): Promise<TranslationBatch> {
  // Filter out empty values and already cached translations
  const toTranslate: TranslationBatch = {};
  const result: TranslationBatch = {};

  for (const [key, text] of Object.entries(texts)) {
    if (!text || text.trim() === '' || text === '-') {
      result[key] = text;
      continue;
    }

    const cacheKey = `${targetLanguage}:${text}`;
    if (translationCache.has(cacheKey)) {
      result[key] = translationCache.get(cacheKey)!;
    } else {
      toTranslate[key] = text;
    }
  }

  // If nothing to translate, return cached results
  if (Object.keys(toTranslate).length === 0) {
    return result;
  }

  try {
    const llm = getDefaultProvider();

    // Build the translation prompt
    const textsToTranslate = Object.entries(toTranslate)
      .map(([key, text]) => `"${key}": "${text}"`)
      .join('\n');

    const messages = [
      {
        role: 'system' as const,
        content: `You are a professional translator specializing in marketing and promotional content.
Translate the following texts to ${targetLanguage}.

IMPORTANT RULES:
1. Keep brand names, numbers, currencies, and percentages unchanged
2. Maintain the promotional/marketing tone
3. Keep it concise - don't expand the text
4. For terms and conditions text, translate naturally but keep legal accuracy
5. For CTA buttons, use action-oriented language natural to ${targetLanguage}

Respond ONLY with a JSON object mapping each key to its translation.
Do not include any explanation or markdown formatting.`
      },
      {
        role: 'user' as const,
        content: `Translate these texts to ${targetLanguage}:\n\n${textsToTranslate}`
      }
    ];

    const translated = await llm.completeWithJson<TranslationBatch>(messages, {
      temperature: 0.3,
      maxTokens: 2000
    });

    // Cache and add to results
    for (const [key, originalText] of Object.entries(toTranslate)) {
      const translatedText = translated[key] || originalText;
      const cacheKey = `${targetLanguage}:${originalText}`;
      translationCache.set(cacheKey, translatedText);
      result[key] = translatedText;
    }

    logger.debug(
      { count: Object.keys(toTranslate).length, targetLanguage },
      'Translated toplist content'
    );

  } catch (error) {
    logger.error({ error, targetLanguage }, 'Failed to translate toplist content');
    // On error, return original texts
    for (const [key, text] of Object.entries(toTranslate)) {
      result[key] = text;
    }
  }

  return result;
}

/**
 * Clears the translation cache
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}

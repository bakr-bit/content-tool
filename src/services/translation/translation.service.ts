import { getDatabase } from '../cache/sqlite-client';
import { createChildLogger } from '../../utils/logger';

const logger = createChildLogger('TranslationService');

interface TranslationRow {
  key: string;
  language: string;
  translation: string;
}

class TranslationService {
  private cache: Map<string, string> = new Map();
  private dbPath: string;

  constructor() {
    this.dbPath = process.env.SQLITE_DB_PATH || './data/cache.db';
  }

  /**
   * Get a translation for a key in a specific language.
   * Falls back to English if translation is not found.
   */
  translate(key: string, language: string): string {
    // Check cache first
    const cacheKey = `${key}:${language}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const db = getDatabase(this.dbPath);

    // Try to get translation for the specific language
    const row = db.prepare(
      'SELECT translation FROM translations WHERE key = ? AND language = ?'
    ).get(key, language) as TranslationRow | undefined;

    if (row) {
      this.cache.set(cacheKey, row.translation);
      return row.translation;
    }

    // If language is a variant (e.g., de-AT), try the base language (de-DE)
    if (language.includes('-')) {
      const baseLanguageMap: Record<string, string> = {
        'de-AT': 'de-DE',
        'en-GB': 'en-US',
        'en-AU': 'en-US',
        'es-MX': 'es-ES',
        'fr-CA': 'fr-FR',
        'pt-PT': 'pt-BR',
        'zh-TW': 'zh-CN',
      };
      const baseLanguage = baseLanguageMap[language];
      if (baseLanguage) {
        const baseRow = db.prepare(
          'SELECT translation FROM translations WHERE key = ? AND language = ?'
        ).get(key, baseLanguage) as TranslationRow | undefined;

        if (baseRow) {
          this.cache.set(cacheKey, baseRow.translation);
          return baseRow.translation;
        }
      }
    }

    // Fall back to the original key (English)
    logger.debug({ key, language }, 'No translation found, using original');
    this.cache.set(cacheKey, key);
    return key;
  }

  /**
   * Translate multiple keys at once (batch operation)
   */
  translateBatch(keys: string[], language: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of keys) {
      result[key] = this.translate(key, language);
    }
    return result;
  }

  /**
   * Add or update a translation
   */
  setTranslation(key: string, language: string, translation: string): void {
    const db = getDatabase(this.dbPath);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO translations (key, language, translation, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key, language) DO UPDATE SET translation = excluded.translation
    `).run(key, language, translation, now);

    // Update cache
    this.cache.set(`${key}:${language}`, translation);
    logger.info({ key, language }, 'Translation updated');
  }

  /**
   * Get all translations for a language
   */
  getAllForLanguage(language: string): Record<string, string> {
    const db = getDatabase(this.dbPath);
    const rows = db.prepare(
      'SELECT key, translation FROM translations WHERE language = ?'
    ).all(language) as TranslationRow[];

    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.translation;
      this.cache.set(`${row.key}:${language}`, row.translation);
    }

    return result;
  }

  /**
   * Clear the cache (useful for testing or after bulk updates)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const translationService = new TranslationService();

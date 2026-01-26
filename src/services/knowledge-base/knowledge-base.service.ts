import * as fs from 'fs';
import * as path from 'path';
import { vectorStoreService } from '../vector-store';
import { VectorDocument } from '../vector-store/types';
import { generateContentHash } from '../vector-store/chunker';
import { createChildLogger } from '../../utils/logger';
import { env } from '../../config/env';
import {
  GamblingAuthoritiesFile,
  GamblingAuthority,
  KnowledgeBaseEntry,
  LocaleFile,
} from './types';

const logger = createChildLogger('KnowledgeBaseService');

const DATA_DIR = path.join(process.cwd(), 'data');

export class KnowledgeBaseService {
  /**
   * Load all knowledge base JSON files from the data directory
   */
  async loadAndIndexAll(): Promise<{ indexed: number; files: string[] }> {
    if (!vectorStoreService.isEnabled()) {
      logger.warn('Vector store not enabled, skipping knowledge base indexing');
      return { indexed: 0, files: [] };
    }

    const files = this.findKnowledgeBaseFiles();
    logger.info({ fileCount: files.length }, 'Found knowledge base files');

    let totalIndexed = 0;

    for (const file of files) {
      const indexed = await this.indexFile(file);
      totalIndexed += indexed;
    }

    logger.info({ totalIndexed, files }, 'Knowledge base indexing complete');
    return { indexed: totalIndexed, files };
  }

  /**
   * Find all JSON files in the data directory and subdirectories
   */
  private findKnowledgeBaseFiles(): string[] {
    if (!fs.existsSync(DATA_DIR)) {
      logger.warn({ dataDir: DATA_DIR }, 'Data directory not found');
      return [];
    }

    const files: string[] = [];

    // Get JSON files in root data directory
    const rootFiles = fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(DATA_DIR, f));
    files.push(...rootFiles);

    // Check for locales subdirectory
    const localesDir = path.join(DATA_DIR, 'locales');
    if (fs.existsSync(localesDir) && fs.statSync(localesDir).isDirectory()) {
      const localeFiles = fs.readdirSync(localesDir)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(localesDir, f));
      files.push(...localeFiles);
    }

    return files;
  }

  /**
   * Index a single knowledge base file
   */
  async indexFile(filePath: string): Promise<number> {
    const fileName = path.basename(filePath);
    logger.info({ fileName }, 'Indexing knowledge base file');

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Detect file type and extract entries
      const entries = this.extractEntries(data, fileName);

      if (entries.length === 0) {
        logger.warn({ fileName }, 'No entries extracted from file');
        return 0;
      }

      // Convert to vector documents
      const docs = this.entriesToDocuments(entries);

      // Index in batches
      const ids = await vectorStoreService.upsertBatch(docs);

      logger.info({ fileName, entryCount: ids.length }, 'File indexed successfully');
      return ids.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ fileName, error: message }, 'Failed to index file');
      return 0;
    }
  }

  /**
   * Extract knowledge base entries from parsed JSON
   */
  private extractEntries(data: unknown, fileName: string): KnowledgeBaseEntry[] {
    const entries: KnowledgeBaseEntry[] = [];

    // Extract country from filename (e.g., "gambling-authorities-sweden.json" -> "Sweden")
    const countryMatch = fileName.match(/gambling-authorities-(\w+)\.json/i);
    const country = countryMatch
      ? countryMatch[1].charAt(0).toUpperCase() + countryMatch[1].slice(1)
      : 'Unknown';

    // Handle gambling authorities format
    if (this.isGamblingAuthoritiesFile(data)) {
      for (const authority of data.gambling_authorities) {
        entries.push(...this.extractAuthorityEntries(authority, country));
      }
    }

    // Handle locale files format (e.g., dk.json, se.json)
    if (this.isLocaleFile(data)) {
      entries.push(...this.extractLocaleEntries(data, fileName));
    }

    return entries;
  }

  /**
   * Type guard for locale file
   */
  private isLocaleFile(data: unknown): data is LocaleFile {
    return (
      typeof data === 'object' &&
      data !== null &&
      'meta' in data &&
      'regulatory' in data &&
      typeof (data as LocaleFile).meta?.market_code === 'string'
    );
  }

  /**
   * Extract entries from a locale file
   */
  private extractLocaleEntries(data: LocaleFile, fileName: string): KnowledgeBaseEntry[] {
    const entries: KnowledgeBaseEntry[] = [];
    const country = data.meta.country_name;
    const marketCode = data.meta.market_code.toUpperCase();

    // Primary authority
    if (data.regulatory?.primary_authority) {
      const auth = data.regulatory.primary_authority;
      entries.push({
        content: `${country} gambling authority: ${auth.name} (${auth.name_en}). ${auth.description}`,
        citation: auth.url,
        category: 'locale_regulatory',
        entityName: auth.name,
        country,
        field: 'primary_authority',
      });
    }

    // Self-exclusion system
    if (data.regulatory?.self_exclusion_system) {
      const sys = data.regulatory.self_exclusion_system;
      const periods = sys.periods?.join(', ') || '';
      entries.push({
        content: `${country} self-exclusion system: ${sys.name}. ${sys.description}. Available periods: ${periods}`,
        citation: sys.url,
        category: 'locale_regulatory',
        entityName: sys.name,
        country,
        field: 'self_exclusion',
      });
    }

    // Help resources
    if (data.regulatory?.help_resources) {
      for (const resource of data.regulatory.help_resources) {
        entries.push({
          content: `${country} gambling help resource: ${resource.name}. ${resource.description}. ${resource.phone ? `Phone: ${resource.phone}` : ''}`,
          citation: resource.url,
          category: 'locale_regulatory',
          entityName: resource.name,
          country,
          field: 'help_resource',
        });
      }
    }

    // Tax rules
    if (data.regulatory?.tax_rules) {
      const tax = data.regulatory.tax_rules;
      const taxContent = [
        tax.eu_licensed && `EU-licensed: ${tax.eu_licensed}`,
        tax.non_eu_licensed && `Non-EU licensed: ${tax.non_eu_licensed}`,
        tax.declaration_note && `Note: ${tax.declaration_note}`,
      ].filter(Boolean).join('. ');

      if (taxContent) {
        entries.push({
          content: `${country} gambling tax rules: ${taxContent}`,
          citation: undefined,
          category: 'locale_regulatory',
          entityName: `${country} Tax Rules`,
          country,
          field: 'tax_rules',
        });
      }
    }

    // Legal framework
    if (data.regulatory?.legal_framework) {
      const legal = data.regulatory.legal_framework;
      entries.push({
        content: `${country} gambling legal framework: ${legal.gambling_act_name} (${legal.gambling_act_year}). ${legal.player_responsibility}`,
        citation: undefined,
        category: 'locale_regulatory',
        entityName: legal.gambling_act_name,
        country,
        field: 'legal_framework',
      });
    }

    // FAQ questions (great for semantic search)
    if (data.faq_common_questions && Array.isArray(data.faq_common_questions)) {
      for (const question of data.faq_common_questions) {
        entries.push({
          content: `FAQ (${country}/${marketCode}): ${question}`,
          citation: undefined,
          category: 'locale_faq',
          entityName: `FAQ ${marketCode}`,
          country,
          field: 'faq',
        });
      }
    }

    // Methodology criteria
    if (data.methodology_criteria) {
      const criteria = Object.values(data.methodology_criteria)
        .map((c: { name: string; weight: string; description: string }) =>
          `${c.name} (${c.weight}): ${c.description}`)
        .join('. ');

      entries.push({
        content: `${country} casino evaluation methodology: ${criteria}`,
        citation: undefined,
        category: 'locale_methodology',
        entityName: `Methodology ${marketCode}`,
        country,
        field: 'methodology',
      });
    }

    return entries;
  }

  /**
   * Type guard for gambling authorities file
   */
  private isGamblingAuthoritiesFile(data: unknown): data is GamblingAuthoritiesFile {
    return (
      typeof data === 'object' &&
      data !== null &&
      'gambling_authorities' in data &&
      Array.isArray((data as GamblingAuthoritiesFile).gambling_authorities)
    );
  }

  /**
   * Extract entries from a single gambling authority
   */
  private extractAuthorityEntries(
    authority: GamblingAuthority,
    country: string
  ): KnowledgeBaseEntry[] {
    const entries: KnowledgeBaseEntry[] = [];
    const entityName = authority.name;

    // Role
    if (authority.role) {
      entries.push({
        content: `${authority.name}: ${authority.role}`,
        citation: authority.role_citation,
        category: 'gambling_authority',
        entityName,
        country,
        field: 'role',
      });
    }

    // Current regulations
    if (authority.current_regulations) {
      entries.push({
        content: `${authority.name} - Current Regulations: ${authority.current_regulations}`,
        citation: authority.current_regulations_citation,
        category: 'gambling_authority',
        entityName,
        country,
        field: 'current_regulations',
      });
    }

    // Upcoming legislative changes
    if (authority.upcoming_legislative_changes) {
      entries.push({
        content: `${authority.name} - Upcoming Changes: ${authority.upcoming_legislative_changes}`,
        citation: authority.upcoming_legislative_changes_citation,
        category: 'gambling_authority',
        entityName,
        country,
        field: 'upcoming_legislative_changes',
      });
    }

    return entries;
  }

  /**
   * Convert knowledge base entries to vector documents
   */
  private entriesToDocuments(entries: KnowledgeBaseEntry[]): VectorDocument[] {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env.EMBEDDING_TTL_DAYS);

    return entries.map(entry => ({
      contentType: 'knowledge_base' as const,
      contentHash: generateContentHash(`kb:${entry.category}:${entry.entityName}:${entry.field}:${entry.content}`),
      sourceUrl: entry.citation,
      sourceTitle: entry.entityName,
      content: entry.content,
      metadata: {
        category: entry.category,
        entityName: entry.entityName,
        country: entry.country,
        field: entry.field,
        citation: entry.citation,
      },
    }));
  }

  /**
   * Search the knowledge base
   */
  async search(query: string, options: { limit?: number; country?: string } = {}) {
    const { limit = 5, country } = options;

    const results = await vectorStoreService.search(query, {
      limit,
      contentTypes: ['knowledge_base'],
      similarityThreshold: 0.5,
    });

    // Filter by country if specified
    if (country) {
      return results.filter(r =>
        (r.metadata?.country as string)?.toLowerCase() === country.toLowerCase()
      );
    }

    return results;
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();

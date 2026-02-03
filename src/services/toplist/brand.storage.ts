import Database from 'better-sqlite3';
import { getDatabase } from '../cache/sqlite-client';
import { createChildLogger } from '../../utils/logger';
import { env } from '../../config/env';

const logger = createChildLogger('BrandStorage');

export interface BrandAttributes {
  license?: string;
  welcomeOffer?: string;
  wageringRequirement?: number | string;
  withdrawalTime?: string;
  paymentMethods?: string[];
  highlights?: string[];
  bestFor?: string;
  overallScore?: number;
  oddsQuality?: string;
  markets?: string[];
  liveStreaming?: boolean;
  cashOut?: boolean;
  [key: string]: unknown;
}

export interface Brand {
  brandId: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  websiteUrl?: string;
  attributes: BrandAttributes;
  createdAt: string;
  updatedAt?: string;
}

interface BrandRow {
  brand_id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  website_url: string | null;
  attributes: string;
  created_at: string;
  updated_at: string | null;
}

function rowToBrand(row: BrandRow): Brand {
  return {
    brandId: row.brand_id,
    name: row.name,
    slug: row.slug ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    attributes: JSON.parse(row.attributes) as BrandAttributes,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export interface ListBrandsOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ListBrandsResult {
  brands: Brand[];
  total: number;
}

export class BrandStorage {
  private db: Database.Database;

  constructor() {
    this.db = getDatabase(env.CACHE_DB_PATH);
  }

  list(options: ListBrandsOptions = {}): ListBrandsResult {
    const { search, limit = 50, offset = 0 } = options;

    try {
      let whereClause = '';
      const params: (string | number)[] = [];

      if (search) {
        whereClause = 'WHERE name LIKE ? OR slug LIKE ?';
        params.push(`%${search}%`, `%${search}%`);
      }

      const countResult = this.db.prepare(`SELECT COUNT(*) as count FROM brands ${whereClause}`).get(...params) as { count: number };

      const rows = this.db.prepare(`
        SELECT * FROM brands
        ${whereClause}
        ORDER BY name ASC
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset) as BrandRow[];

      return {
        brands: rows.map(rowToBrand),
        total: countResult.count,
      };
    } catch (error) {
      logger.error({ error, options }, 'Error listing brands');
      throw error;
    }
  }

  getById(brandId: string): Brand | null {
    try {
      const row = this.db.prepare('SELECT * FROM brands WHERE brand_id = ?').get(brandId) as BrandRow | undefined;
      return row ? rowToBrand(row) : null;
    } catch (error) {
      logger.error({ error, brandId }, 'Error fetching brand');
      throw error;
    }
  }

  getBySlug(slug: string): Brand | null {
    try {
      const row = this.db.prepare('SELECT * FROM brands WHERE slug = ?').get(slug) as BrandRow | undefined;
      return row ? rowToBrand(row) : null;
    } catch (error) {
      logger.error({ error, slug }, 'Error fetching brand by slug');
      throw error;
    }
  }

  create(brand: Omit<Brand, 'createdAt' | 'updatedAt'>): Brand {
    const now = new Date().toISOString();

    try {
      this.db.prepare(`
        INSERT INTO brands (brand_id, name, slug, logo_url, website_url, attributes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        brand.brandId,
        brand.name,
        brand.slug ?? null,
        brand.logoUrl ?? null,
        brand.websiteUrl ?? null,
        JSON.stringify(brand.attributes),
        now
      );

      logger.info({ brandId: brand.brandId, name: brand.name }, 'Brand created');

      return {
        ...brand,
        createdAt: now,
      };
    } catch (error) {
      logger.error({ error, brandId: brand.brandId }, 'Error creating brand');
      throw error;
    }
  }

  update(brandId: string, updates: Partial<Omit<Brand, 'brandId' | 'createdAt' | 'updatedAt'>>): Brand | null {
    const now = new Date().toISOString();
    const existing = this.getById(brandId);

    if (!existing) {
      return null;
    }

    try {
      this.db.prepare(`
        UPDATE brands
        SET name = ?, slug = ?, logo_url = ?, website_url = ?, attributes = ?, updated_at = ?
        WHERE brand_id = ?
      `).run(
        updates.name ?? existing.name,
        updates.slug ?? existing.slug ?? null,
        updates.logoUrl ?? existing.logoUrl ?? null,
        updates.websiteUrl ?? existing.websiteUrl ?? null,
        updates.attributes ? JSON.stringify(updates.attributes) : JSON.stringify(existing.attributes),
        now,
        brandId
      );

      logger.info({ brandId }, 'Brand updated');

      return {
        ...existing,
        ...updates,
        updatedAt: now,
      };
    } catch (error) {
      logger.error({ error, brandId }, 'Error updating brand');
      throw error;
    }
  }

  delete(brandId: string): boolean {
    try {
      const result = this.db.prepare('DELETE FROM brands WHERE brand_id = ?').run(brandId);
      if (result.changes > 0) {
        logger.info({ brandId }, 'Brand deleted');
        return true;
      }
      return false;
    } catch (error) {
      logger.error({ error, brandId }, 'Error deleting brand');
      throw error;
    }
  }

  search(query: string, limit = 10): Brand[] {
    try {
      const rows = this.db.prepare(`
        SELECT * FROM brands
        WHERE name LIKE ? OR slug LIKE ?
        ORDER BY name ASC
        LIMIT ?
      `).all(`%${query}%`, `%${query}%`, limit) as BrandRow[];

      return rows.map(rowToBrand);
    } catch (error) {
      logger.error({ error, query }, 'Error searching brands');
      throw error;
    }
  }
}

export const brandStorage = new BrandStorage();

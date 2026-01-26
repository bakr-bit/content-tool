import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createChildLogger } from '../../utils/logger';

const logger = createChildLogger('SQLiteClient');

let db: Database.Database | null = null;

const SCHEMA_VERSION = 2;

const MIGRATIONS: Record<number, string[]> = {
  1: [
    // SERP results cache
    `CREATE TABLE IF NOT EXISTS serp_cache (
      id TEXT PRIMARY KEY,
      keyword TEXT NOT NULL,
      geo TEXT NOT NULL,
      results TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_serp_expires ON serp_cache(expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_serp_keyword_geo ON serp_cache(keyword, geo)`,

    // Scraped pages cache
    `CREATE TABLE IF NOT EXISTS page_cache (
      url TEXT PRIMARY KEY,
      title TEXT,
      content TEXT NOT NULL,
      word_count INTEGER,
      scraped_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_page_expires ON page_cache(expires_at)`,

    // Schema version tracking
    `CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    )`,
  ],
  2: [
    // Articles storage
    `CREATE TABLE IF NOT EXISTS articles (
      article_id TEXT PRIMARY KEY,
      outline_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      sections TEXT NOT NULL,
      metadata TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_articles_keyword ON articles(keyword)`,
    `CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)`,
  ],
};

function ensureDataDirectory(dbPath: string): void {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info({ dir }, 'Created data directory');
  }
}

function getCurrentVersion(database: Database.Database): number {
  try {
    const row = database.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as { version: number } | undefined;
    return row?.version ?? 0;
  } catch {
    return 0;
  }
}

function runMigrations(database: Database.Database): void {
  const currentVersion = getCurrentVersion(database);

  if (currentVersion >= SCHEMA_VERSION) {
    logger.debug({ currentVersion, targetVersion: SCHEMA_VERSION }, 'Database schema is up to date');
    return;
  }

  logger.info({ currentVersion, targetVersion: SCHEMA_VERSION }, 'Running database migrations');

  for (let version = currentVersion + 1; version <= SCHEMA_VERSION; version++) {
    const statements = MIGRATIONS[version];
    if (!statements) continue;

    database.transaction(() => {
      for (const sql of statements) {
        database.exec(sql);
      }
      database.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(version);
    })();

    logger.info({ version }, 'Applied migration');
  }
}

export function getDatabase(dbPath: string): Database.Database {
  if (db) {
    return db;
  }

  ensureDataDirectory(dbPath);

  logger.info({ dbPath }, 'Initializing SQLite database');

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');

  // Run migrations
  runMigrations(db);

  logger.info('SQLite database initialized successfully');

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('SQLite database closed');
  }
}

export function getDatabaseStats(database: Database.Database): { serpEntries: number; pageEntries: number; dbSizeBytes: number } {
  const serpCount = database.prepare('SELECT COUNT(*) as count FROM serp_cache').get() as { count: number };
  const pageCount = database.prepare('SELECT COUNT(*) as count FROM page_cache').get() as { count: number };
  const pageSize = database.pragma('page_size', { simple: true }) as number;
  const pageCount2 = database.pragma('page_count', { simple: true }) as number;

  return {
    serpEntries: serpCount.count,
    pageEntries: pageCount.count,
    dbSizeBytes: pageSize * pageCount2,
  };
}

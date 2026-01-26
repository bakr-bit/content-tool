import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { AuthorProfile } from '../../types/generation-options';
import { logger } from '../../utils/logger';

const DATA_DIR = path.join(process.cwd(), 'data');
const AUTHORS_FILE = path.join(DATA_DIR, 'authors.json');

interface AuthorsData {
  authors: AuthorProfile[];
  version: number;
}

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    throw new Error('Data directory does not exist');
  }
}

function getEmptyData(): AuthorsData {
  return {
    authors: [],
    version: 1,
  };
}

export function loadAuthors(): AuthorProfile[] {
  try {
    ensureDataDir();

    if (!existsSync(AUTHORS_FILE)) {
      return [];
    }

    const content = readFileSync(AUTHORS_FILE, 'utf-8');
    const data: AuthorsData = JSON.parse(content);

    return data.authors || [];
  } catch (error) {
    logger.error({ error }, 'Failed to load authors from storage');
    return [];
  }
}

export function saveAuthors(authors: AuthorProfile[]): void {
  try {
    ensureDataDir();

    const data: AuthorsData = {
      authors,
      version: 1,
    };

    writeFileSync(AUTHORS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    logger.info({ count: authors.length }, 'Authors saved to storage');
  } catch (error) {
    logger.error({ error }, 'Failed to save authors to storage');
    throw new Error('Failed to save authors');
  }
}

export function addAuthor(author: AuthorProfile): void {
  const authors = loadAuthors();
  authors.push(author);
  saveAuthors(authors);
}

export function updateAuthor(id: string, updates: Partial<AuthorProfile>): AuthorProfile | null {
  const authors = loadAuthors();
  const index = authors.findIndex((a) => a.id === id);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...authors[index],
    ...updates,
    id: authors[index].id, // Ensure ID cannot be changed
    updatedAt: new Date().toISOString(),
  };

  authors[index] = updated;
  saveAuthors(authors);

  return updated;
}

export function deleteAuthor(id: string): boolean {
  const authors = loadAuthors();
  const filtered = authors.filter((a) => a.id !== id);

  if (filtered.length === authors.length) {
    return false; // Author not found
  }

  saveAuthors(filtered);
  return true;
}

export function getAuthorById(id: string): AuthorProfile | null {
  const authors = loadAuthors();
  return authors.find((a) => a.id === id) || null;
}

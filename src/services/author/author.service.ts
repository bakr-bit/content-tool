import { v4 as uuidv4 } from 'uuid';
import { AuthorProfile, getAuthorDisplayName } from '../../types/generation-options';
import { getAllBuiltInAuthorProfiles, getBuiltInAuthorProfile } from '../../config/author-profiles';
import * as storage from './author.storage';
import { logger } from '../../utils/logger';

export interface CreateAuthorInput {
  firstName: string;
  lastName: string;
  description?: string;
  site?: string;
  language: AuthorProfile['language'];
  targetCountry: AuthorProfile['targetCountry'];
  tone: AuthorProfile['tone'];
  pointOfView: AuthorProfile['pointOfView'];
  formality: AuthorProfile['formality'];
  customTonePrompt?: string;
  formatting?: AuthorProfile['formatting'];
  headingCase?: AuthorProfile['headingCase'];
}

export interface UpdateAuthorInput {
  firstName?: string;
  lastName?: string;
  description?: string;
  site?: string;
  language?: AuthorProfile['language'];
  targetCountry?: AuthorProfile['targetCountry'];
  tone?: AuthorProfile['tone'];
  pointOfView?: AuthorProfile['pointOfView'];
  formality?: AuthorProfile['formality'];
  customTonePrompt?: string;
  formatting?: AuthorProfile['formatting'];
  headingCase?: AuthorProfile['headingCase'];
}

/**
 * Get all authors (built-in + custom)
 */
export function getAllAuthors(): AuthorProfile[] {
  const builtIn = getAllBuiltInAuthorProfiles();
  const custom = storage.loadAuthors();
  return [...builtIn, ...custom];
}

/**
 * Get a single author by ID (checks both built-in and custom)
 */
export function getAuthorById(id: string): AuthorProfile | null {
  // Check built-in first
  const builtIn = getBuiltInAuthorProfile(id);
  if (builtIn) {
    return builtIn;
  }

  // Check custom authors
  return storage.getAuthorById(id);
}

/**
 * Create a new custom author
 */
export function createAuthor(input: CreateAuthorInput): AuthorProfile {
  const id = uuidv4();
  const now = new Date().toISOString();

  const author: AuthorProfile = {
    id,
    firstName: input.firstName,
    lastName: input.lastName,
    description: input.description,
    site: input.site,
    language: input.language,
    targetCountry: input.targetCountry,
    tone: input.tone,
    pointOfView: input.pointOfView,
    formality: input.formality,
    customTonePrompt: input.customTonePrompt,
    formatting: input.formatting,
    headingCase: input.headingCase,
    isBuiltIn: false,
    createdAt: now,
    updatedAt: now,
  };

  storage.addAuthor(author);
  logger.info({ authorId: id, name: getAuthorDisplayName(author) }, 'Created new author');

  return author;
}

/**
 * Update a custom author
 * Returns null if author not found or is built-in
 */
export function updateAuthor(id: string, input: UpdateAuthorInput): AuthorProfile | null {
  // Check if it's a built-in author
  const builtIn = getBuiltInAuthorProfile(id);
  if (builtIn) {
    logger.warn({ authorId: id }, 'Cannot update built-in author');
    return null;
  }

  const updated = storage.updateAuthor(id, input);
  if (updated) {
    logger.info({ authorId: id, name: getAuthorDisplayName(updated) }, 'Updated author');
  }

  return updated;
}

/**
 * Delete a custom author
 * Returns false if author not found or is built-in
 */
export function deleteAuthor(id: string): boolean {
  // Check if it's a built-in author
  const builtIn = getBuiltInAuthorProfile(id);
  if (builtIn) {
    logger.warn({ authorId: id }, 'Cannot delete built-in author');
    return false;
  }

  const deleted = storage.deleteAuthor(id);
  if (deleted) {
    logger.info({ authorId: id }, 'Deleted author');
  }

  return deleted;
}

/**
 * Check if an author is built-in
 */
export function isBuiltInAuthor(id: string): boolean {
  return getBuiltInAuthorProfile(id) !== undefined;
}

/**
 * Duplicate an existing author (creates a new custom author)
 */
export function duplicateAuthor(id: string): AuthorProfile | null {
  const source = getAuthorById(id);
  if (!source) {
    return null;
  }

  return createAuthor({
    firstName: source.firstName,
    lastName: `${source.lastName} (Copy)`,
    description: source.description,
    site: source.site,
    language: source.language,
    targetCountry: source.targetCountry,
    tone: source.tone,
    pointOfView: source.pointOfView,
    formality: source.formality,
    customTonePrompt: source.customTonePrompt,
    formatting: source.formatting,
    headingCase: source.headingCase,
  });
}

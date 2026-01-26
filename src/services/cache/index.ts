import { CacheService } from './cache.service';
import { CACHE_CONFIG } from '../../config/constants';

export * from './cache.service';
export * from './sqlite-client';

// Singleton cache service instance
export const cacheService = new CacheService({
  enabled: CACHE_CONFIG.ENABLED,
  dbPath: CACHE_CONFIG.DB_PATH,
  ttlDays: CACHE_CONFIG.TTL_DAYS,
});

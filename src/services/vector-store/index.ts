export { VectorStoreService, vectorStoreService } from './vector-store.service';
export {
  LocalVectorClient,
  LocalVectorClient as SupabaseVectorClient, // back-compat alias
  localVectorClient,
  localVectorClient as supabaseVectorClient, // back-compat alias
} from './local-vector-client';
export { chunkText, generateContentHash } from './chunker';
export * from './types';

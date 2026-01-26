-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the content_embeddings table
CREATE TABLE IF NOT EXISTS content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('page_chunk', 'fact', 'research_answer')),
  content_hash TEXT NOT NULL,
  source_url TEXT,
  source_title TEXT,
  chunk_index INTEGER,
  total_chunks INTEGER,
  content TEXT NOT NULL,
  embedding vector(768) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT unique_content UNIQUE (content_hash, content_type)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_content_embeddings_embedding
  ON content_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_content_type
  ON content_embeddings(content_type);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_source_url
  ON content_embeddings(source_url);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_expires_at
  ON content_embeddings(expires_at);

-- Create the similarity search function
CREATE OR REPLACE FUNCTION match_content_embeddings(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  filter_content_types TEXT[] DEFAULT NULL,
  filter_source_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  content_hash TEXT,
  source_url TEXT,
  source_title TEXT,
  chunk_index INTEGER,
  total_chunks INTEGER,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.content_type,
    ce.content_hash,
    ce.source_url,
    ce.source_title,
    ce.chunk_index,
    ce.total_chunks,
    ce.content,
    ce.metadata,
    ce.created_at,
    ce.expires_at,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM content_embeddings ce
  WHERE
    -- Filter by similarity threshold
    1 - (ce.embedding <=> query_embedding) >= match_threshold
    -- Filter by content type if specified
    AND (filter_content_types IS NULL OR ce.content_type = ANY(filter_content_types))
    -- Filter by source URL if specified
    AND (filter_source_url IS NULL OR ce.source_url = filter_source_url)
    -- Exclude expired documents
    AND (ce.expires_at IS NULL OR ce.expires_at > NOW())
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant access to the function for authenticated users
GRANT EXECUTE ON FUNCTION match_content_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION match_content_embeddings TO anon;

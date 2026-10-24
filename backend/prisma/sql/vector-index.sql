-- Vector extension and sequence (run before table creation if using raw SQL / fallback)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE SEQUENCE IF NOT EXISTS complaint_ticket_seq START 1;

-- Post-table creation constraints and vector index (HNSW with cosine distance)
ALTER TABLE "feedback" ADD CONSTRAINT feedback_rating_check CHECK (rating BETWEEN 1 AND 5);
CREATE INDEX IF NOT EXISTS complaints_embedding_idx
  ON "complaints" USING hnsw (embedding vector_cosine_ops);

-- Phase 2.1: Full-text search performance
-- Adds GIN indexes so to_tsvector queries hit an index instead of scanning every row.
-- Also enables pg_trgm for fast ILIKE / partial-match on name.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Functional GIN index for full-text search.
-- The expression must exactly match the one used in searchProducts raw SQL:
--   to_tsvector('english', coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(description,''))
CREATE INDEX IF NOT EXISTS "Products_fts_gin_idx" ON "Products"
  USING gin(
    to_tsvector(
      'english',
      coalesce(name, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(description, '')
    )
  );

-- Trigram index on name for fast ILIKE lookups (suggestions, admin search)
CREATE INDEX IF NOT EXISTS "Products_name_trgm_idx" ON "Products"
  USING gin(name gin_trgm_ops);

-- Trigram index on brand for fast brand ILIKE lookups
CREATE INDEX IF NOT EXISTS "Products_brand_trgm_idx" ON "Products"
  USING gin(brand gin_trgm_ops);

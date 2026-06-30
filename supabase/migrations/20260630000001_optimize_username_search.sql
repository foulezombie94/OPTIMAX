-- Enable the pg_trgm extension if not already enabled (useful for ILIKE searches)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a GIN index on the username column for lightning fast ILIKE text searches
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON public.profiles USING GIN (username gin_trgm_ops);

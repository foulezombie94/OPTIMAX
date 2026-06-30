-- Add price to optimizations
ALTER TABLE optimizations ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    optimization_id UUID NOT NULL REFERENCES optimizations(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    stripe_session_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS on purchases
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Users can only see their own purchases
CREATE POLICY "Users can view their own purchases"
ON purchases FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only service role can insert (handled by webhook)
-- We don't add insert policies for authenticated users to prevent spoofing

-- Recreate view to include price
DROP VIEW IF EXISTS public_optimizations_popularity;

CREATE VIEW public_optimizations_popularity AS
SELECT 
    o.id,
    o.user_id,
    o.file_name,
    o.original_size,
    o.compressed_size,
    o.file_type,
    o.created_at,
    o.preview_url,
    o.is_public,
    o.views,
    o.likes,
    o.shares,
    o.price,
    COALESCE(NULLIF(p.username, ''), split_part(p.email, '@', 1), 'créateur') AS creator_name,
    p.is_pro AS creator_is_pro,
    (COALESCE(o.likes, 0) * 10 + COALESCE(o.shares, 0) * 5 + COALESCE(o.views, 0)) AS popularity_score
FROM optimizations o
LEFT JOIN profiles p ON o.user_id = p.id
WHERE o.is_public = true;

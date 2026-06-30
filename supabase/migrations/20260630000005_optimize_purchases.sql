-- Create a unique composite index to prevent double purchases
-- and optimize the ownership check queries (which run on every model view/checkout)
CREATE UNIQUE INDEX IF NOT EXISTS purchases_user_optimization_idx ON purchases (user_id, optimization_id);

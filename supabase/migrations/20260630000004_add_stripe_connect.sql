-- Add stripe_account_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

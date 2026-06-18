-- Add Soft Delete and Admin Role Columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. SECURITY DEFINER FUNCTION FOR RLS
-- Safely fetches user role bypassing RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. TRIGGER FOR PROTECTING SENSITIVE COLUMNS
-- Prevents standard users from modifying their own role or deactivated_at status
CREATE OR REPLACE FUNCTION public.protect_admin_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Prevent non-admins from modifying sensitive columns
  IF (public.get_user_role() IS DISTINCT FROM 'admin') AND (auth.role() = 'authenticated') THEN
    NEW.role = OLD.role;
    NEW.deactivated_at = OLD.deactivated_at;
    NEW.is_pro = OLD.is_pro;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_admin_columns_trigger ON public.profiles;
CREATE TRIGGER protect_admin_columns_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_admin_columns();

-- 3. RLS POLICIES
-- Drop existing problematic public policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Users can only view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING ( auth.uid() = id );

-- Admins can view and update all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING ( public.get_user_role() = 'admin' );

CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING ( public.get_user_role() = 'admin' );

/*
  # Fix RLS policies recursion

  1. Changes
    - Remove recursive admin checks from RLS policies
    - Simplify policy conditions
    - Add direct role-based checks
    - Fix user profile creation trigger
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;

-- Create simplified policies without recursion
CREATE POLICY "enable_read_own_profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "enable_read_all_profiles_admin"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "enable_insert_profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "enable_update_own_profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Update the handle_new_user function to include role in JWT claims
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_role user_role;
BEGIN
  -- Get the role from metadata or default to client
  new_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'client'::user_role
  );
  
  -- Insert the user profile
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    new_role
  );

  -- Update user's JWT claims to include role
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', new_role)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;
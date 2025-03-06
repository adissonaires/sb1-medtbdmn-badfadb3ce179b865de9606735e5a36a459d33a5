/*
  # Fix RLS policies to avoid recursion

  1. Changes
    - Drop all existing policies
    - Create simplified non-recursive policies
    - Maintain trigger for user creation
    - Add admin role check function

  2. Security
    - Maintain data access control
    - Prevent infinite recursion
    - Keep automatic user profile creation
*/

-- First, drop all existing policies
DROP POLICY IF EXISTS "Enable read access for users" ON users;
DROP POLICY IF EXISTS "Enable insert for registration" ON users;
DROP POLICY IF EXISTS "Enable update for owners and admins" ON users;

-- Create a function to check admin role without recursion
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users
    WHERE id = user_id 
    AND role = 'admin'::user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Keep the existing user creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client'::user_role)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger is properly set
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create new non-recursive policies
CREATE POLICY "users_read_policy"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    is_admin(auth.uid())
  );

CREATE POLICY "users_insert_policy"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "users_update_policy"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR
    is_admin(auth.uid())
  )
  WITH CHECK (
    id = auth.uid() OR
    is_admin(auth.uid())
  );

CREATE POLICY "users_delete_policy"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    id = auth.uid() OR
    is_admin(auth.uid())
  );
/*
  # Fix Authentication System

  1. Changes
    - Drop existing triggers and functions in correct order
    - Create admin check function
    - Create user profile handler
    - Set up automatic profile creation
    - Create simplified policies

  2. Security
    - Allow public registration
    - Maintain data access control
    - Prevent recursion issues
*/

-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Then drop the functions
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS is_admin();

-- Drop existing policies
DROP POLICY IF EXISTS "users_read_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- Create admin check function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid() 
    AND role = 'admin'::user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user profile handler
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'client'::user_role
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create simplified policies
CREATE POLICY "Allow public registration"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable read access"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR is_admin()
  );

CREATE POLICY "Enable self-service updates"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR is_admin())
  WITH CHECK (id = auth.uid() OR is_admin());
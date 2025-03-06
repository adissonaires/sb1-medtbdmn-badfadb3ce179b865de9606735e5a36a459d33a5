/*
  # Fix user registration flow

  1. Changes
    - Drop all existing user policies
    - Create simplified RLS policies
    - Add trigger to sync auth.users with public.users
    - Add function to handle user creation

  2. Security
    - Enable public access for initial user creation
    - Maintain RLS for other operations
    - Ensure data consistency between auth and public users
*/

-- First, drop all existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert access for everyone" ON users;
DROP POLICY IF EXISTS "Enable update for users and admins" ON users;

-- Create function to handle user creation
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

-- Create trigger to automatically handle new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create simplified RLS policies
CREATE POLICY "Enable read access for users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own data
    auth.uid() = id
    -- Admins can read all data
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Enable insert for registration"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable update for owners and admins"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own data
    auth.uid() = id
    -- Admins can update any user
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    -- Same conditions for the check
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
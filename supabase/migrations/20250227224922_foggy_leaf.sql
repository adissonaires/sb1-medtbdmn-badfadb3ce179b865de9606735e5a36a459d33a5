/*
  # Fix user registration policies

  1. Changes
    - Drop existing policies
    - Add simplified policies for user management
    - Enable public registration while maintaining security

  2. Security
    - Maintains RLS enabled
    - Allows initial user creation
    - Maintains security for subsequent operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can manage their own data" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Create simplified policies
CREATE POLICY "Enable read access for authenticated users"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Enable insert access for everyone"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable update for users and admins"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (auth.uid() = id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));
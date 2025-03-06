/*
  # Fix user registration policies

  1. Changes
    - Add policy to allow new user registration
    - Add policy for users to update their own data
    - Add policy for admins to manage all users

  2. Security
    - Maintains RLS enabled
    - Restricts access based on user role and ownership
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;

-- Create new policies for users table
CREATE POLICY "Users can manage their own data"
  ON users
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow user registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
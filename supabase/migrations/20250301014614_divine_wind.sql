/*
  # Service Management System Updates

  1. New Fields
    - Add `description` text field to services table
    - Add `features` jsonb array field to services table
    - Add `image_url` text field to services table
  
  2. Audit Logging
    - Create audit_logs table for tracking changes
*/

-- Add new fields to services table
ALTER TABLE services 
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS image_url text;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  details text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for audit_logs
CREATE POLICY "Only admins can read audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can create audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
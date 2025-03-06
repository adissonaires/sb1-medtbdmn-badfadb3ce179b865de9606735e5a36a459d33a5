/*
  # Dealership Management System

  1. New Tables
    - `dealerships`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `street` (text, required)
      - `number` (text, required)
      - `city` (text, required)
      - `state` (text, required)
      - `zip_code` (text, required)
      - `phone` (text, required)
      - `email` (text, required)
      - `business_hours` (jsonb, required)
      - `registration_number` (text, unique, required)
      - `status` (text, required, default 'active')
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - `created_by` (uuid, references users.id)
      - `updated_by` (uuid, references users.id)
  
  2. Security
    - Enable RLS on `dealerships` table
    - Add policies for authenticated users to read dealerships
    - Add policies for admins to manage dealerships
*/

-- Create dealerships table
CREATE TABLE IF NOT EXISTS dealerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  street text NOT NULL,
  number text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  business_hours jsonb NOT NULL DEFAULT '{"monday":{"open":"09:00","close":"18:00"},"tuesday":{"open":"09:00","close":"18:00"},"wednesday":{"open":"09:00","close":"18:00"},"thursday":{"open":"09:00","close":"18:00"},"friday":{"open":"09:00","close":"18:00"},"saturday":{"open":"10:00","close":"16:00"},"sunday":{"open":"","close":""}}',
  registration_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE dealerships ENABLE ROW LEVEL SECURITY;

-- Create policies for dealerships table
CREATE POLICY "Anyone can read active dealerships"
  ON dealerships
  FOR SELECT
  TO authenticated
  USING (status = 'active' OR EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can manage dealerships"
  ON dealerships
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
/*
  # Create employee allocations table

  1. New Tables
    - `employee_allocations`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, references users)
      - `client_id` (uuid, references users)
      - `date` (date)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  2. Security
    - Enable RLS on `employee_allocations` table
    - Add policies for admins to manage allocations
    - Add policies for employees to read their own allocations
*/

-- Create employee_allocations table
CREATE TABLE IF NOT EXISTS employee_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Enable Row Level Security
ALTER TABLE employee_allocations ENABLE ROW LEVEL SECURITY;

-- Create policies for employee_allocations table
CREATE POLICY "Admins can manage all allocations"
  ON employee_allocations
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

CREATE POLICY "Employees can read their own allocations"
  ON employee_allocations
  FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid() OR
    client_id = auth.uid()
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS employee_allocations_date_idx ON employee_allocations(date);
CREATE INDEX IF NOT EXISTS employee_allocations_employee_idx ON employee_allocations(employee_id);
CREATE INDEX IF NOT EXISTS employee_allocations_client_idx ON employee_allocations(client_id);
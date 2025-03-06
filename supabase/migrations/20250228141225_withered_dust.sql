/*
  # Employee Module Tables

  1. New Tables
    - `employee_allocations`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, references users)
      - `client_id` (uuid, references users)
      - `date` (date)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create employee_allocations table
CREATE TABLE IF NOT EXISTS employee_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE employee_allocations ENABLE ROW LEVEL SECURITY;

-- Create policies for employee_allocations
CREATE POLICY "Admins can manage all allocations"
  ON employee_allocations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Employees can view their own allocations"
  ON employee_allocations
  FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
  );

CREATE POLICY "Clients can view their own allocations"
  ON employee_allocations
  FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid()
  );
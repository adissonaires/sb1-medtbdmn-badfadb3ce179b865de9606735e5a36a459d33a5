/*
  # Employee Module Tables

  1. New Tables
    - `work_sessions` - Tracks employee clock-in/clock-out
      - `id` (uuid, primary key)
      - `employee_id` (uuid, references users)
      - `clock_in_time` (timestamptz)
      - `clock_out_time` (timestamptz, nullable)
      - `clock_in_location` (jsonb)
      - `clock_out_location` (jsonb, nullable)
      - `total_hours` (float, nullable)
      - `status` (enum: 'active', 'completed')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `service_records` - Tracks services performed by employees
      - `id` (uuid, primary key)
      - `employee_id` (uuid, references users)
      - `client_id` (uuid, references users)
      - `service_id` (uuid, references services)
      - `work_session_id` (uuid, references work_sessions)
      - `before_photo_url` (text, nullable)
      - `after_photo_url` (text, nullable)
      - `notes` (text, nullable)
      - `status` (enum: 'in_progress', 'completed')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
  2. Security
    - Enable RLS on all tables
    - Add policies for employees to manage their own records
    - Add policies for admins to view all records
*/

-- Create work session status enum
CREATE TYPE work_session_status AS ENUM ('active', 'completed');

-- Create service record status enum
CREATE TYPE service_record_status AS ENUM ('in_progress', 'completed');

-- Create work_sessions table
CREATE TABLE IF NOT EXISTS work_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  clock_in_time timestamptz NOT NULL,
  clock_out_time timestamptz,
  clock_in_location jsonb,
  clock_out_location jsonb,
  total_hours float,
  status work_session_status NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create service_records table
CREATE TABLE IF NOT EXISTS service_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES users(id) ON DELETE SET NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  work_session_id uuid REFERENCES work_sessions(id) ON DELETE SET NULL,
  before_photo_url text,
  after_photo_url text,
  notes text,
  status service_record_status NOT NULL DEFAULT 'in_progress',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;

-- Create policies for work_sessions
CREATE POLICY "Employees can view their own work sessions"
  ON work_sessions
  FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Employees can insert their own work sessions"
  ON work_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'employee'
    )
  );

CREATE POLICY "Employees can update their own work sessions"
  ON work_sessions
  FOR UPDATE
  TO authenticated
  USING (
    employee_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'employee'
    )
  )
  WITH CHECK (
    employee_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'employee'
    )
  );

-- Create policies for service_records
CREATE POLICY "Employees can view their own service records"
  ON service_records
  FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can view their own service records"
  ON service_records
  FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid()
  );

CREATE POLICY "Employees can insert their own service records"
  ON service_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'employee'
    )
  );

CREATE POLICY "Employees can update their own service records"
  ON service_records
  FOR UPDATE
  TO authenticated
  USING (
    employee_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'employee'
    )
  )
  WITH CHECK (
    employee_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'employee'
    )
  );
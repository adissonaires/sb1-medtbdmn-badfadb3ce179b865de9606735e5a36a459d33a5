/*
  # Service Assignment System

  1. New Tables
    - `service_assignments` - Stores service assignments between employees and dealerships
      - `id` (uuid, primary key)
      - `employee_id` (uuid, references users)
      - `dealership_id` (uuid, references dealerships)
      - `service_id` (uuid, references services)
      - `scheduled_date` (date)
      - `scheduled_time` (text)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, references users)
      - `updated_by` (uuid, references users)

  2. Security
    - Enable RLS on `service_assignments` table
    - Add policies for authenticated users
*/

-- Create service_assignments table
CREATE TABLE IF NOT EXISTS service_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  dealership_id uuid REFERENCES dealerships(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  scheduled_time text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE service_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for service_assignments
CREATE POLICY "Admins can manage all service assignments"
  ON service_assignments
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

CREATE POLICY "Employees can view their own assignments"
  ON service_assignments
  FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
  );

CREATE POLICY "Employees can update their own assignments"
  ON service_assignments
  FOR UPDATE
  TO authenticated
  USING (
    employee_id = auth.uid()
  )
  WITH CHECK (
    employee_id = auth.uid() AND
    (status = 'in_progress' OR status = 'completed')
  );

CREATE POLICY "Clients can view assignments for their dealerships"
  ON service_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'client' AND
      dealership_id IN (
        SELECT id FROM dealerships
        WHERE created_by = auth.uid()
      )
    )
  );
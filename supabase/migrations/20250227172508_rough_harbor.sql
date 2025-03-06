-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'client', 'employee');
CREATE TYPE appointment_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role user_role NOT NULL DEFAULT 'client',
  created_at timestamptz DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration interval NOT NULL,
  price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  service_id uuid REFERENCES services(id) ON DELETE RESTRICT,
  vehicle_details text NOT NULL,
  scheduled_time timestamptz NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create policies for services table
CREATE POLICY "Anyone can read services"
  ON services
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify services"
  ON services
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create policies for appointments table
CREATE POLICY "Users can read their own appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid() OR
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can create appointments"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'client'
    )
  );

CREATE POLICY "Employees can update their appointments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert initial services
INSERT INTO services (name, duration, price) VALUES
  ('Full Detail', '3 hours', 199.99),
  ('Express Wash', '1 hour', 49.99),
  ('Interior Clean', '2 hours', 149.99);
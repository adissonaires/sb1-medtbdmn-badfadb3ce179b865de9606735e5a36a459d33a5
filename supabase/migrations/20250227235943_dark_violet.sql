/*
  # Fix Authentication Setup

  1. Changes
    - Drop all existing tables and types
    - Recreate tables with proper structure
    - Set up correct RLS policies
    - Create user trigger

  2. Security
    - Enable RLS on all tables
    - Set up proper policies for authentication
*/

-- First drop existing tables if they exist
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS users;

-- Drop existing types if they exist
DROP TYPE IF EXISTS appointment_status;
DROP TYPE IF EXISTS user_role;

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'client', 'employee');
CREATE TYPE appointment_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role user_role NOT NULL DEFAULT 'client',
  created_at timestamptz DEFAULT now()
);

-- Create services table
CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration interval NOT NULL,
  price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create appointments table
CREATE TABLE appointments (
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
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow user registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policies for services table
CREATE POLICY "Anyone can read services"
  ON services
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify services"
  ON services
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

-- Create policies for appointments table
CREATE POLICY "Users can read own appointments"
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
    client_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'client'
    )
  );

CREATE POLICY "Users can update own appointments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (
    (client_id = auth.uid() AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'client'
    )) OR
    (employee_id = auth.uid() AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee'
    )) OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'client'::user_role
    )
  );
  RETURN NEW;
END;
$$;

-- Create trigger for handling new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert initial services
INSERT INTO services (name, duration, price) VALUES
  ('Full Detail', '3 hours', 199.99),
  ('Express Wash', '1 hour', 49.99),
  ('Interior Clean', '2 hours', 149.99);
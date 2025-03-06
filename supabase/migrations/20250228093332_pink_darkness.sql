/*
  # Add user management fields

  1. New Fields
    - Added to `users` table:
      - `specialty` (text, nullable) - For employee service specialty
      - `status` (user_status enum, default 'active') - For tracking active/inactive users
      - `contact_person` (text, nullable) - For client contact information
      - `phone` (text, nullable) - For user contact information
      - `address` (text, nullable) - For client address
      - `work_location` (text, nullable) - For employee work location
      - `permissions_level` (admin_level enum, nullable) - For admin permission levels
      - `updated_at` (timestamptz, nullable) - For tracking when user was last updated
  
  2. New Types
    - `user_status` enum: 'active', 'inactive'
    - `admin_level` enum: 'super_admin', 'admin'
*/

-- Create new enum types
CREATE TYPE user_status AS ENUM ('active', 'inactive');
CREATE TYPE admin_level AS ENUM ('super_admin', 'admin');

-- Add new fields to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS work_location text,
  ADD COLUMN IF NOT EXISTS permissions_level admin_level,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Update existing users to have active status
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Set super_admin permission for any existing admin users
UPDATE users SET permissions_level = 'super_admin' WHERE role = 'admin' AND permissions_level IS NULL;

-- Improve the handle_new_user function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_role user_role;
  user_exists boolean;
BEGIN
  -- Check if user already exists to prevent duplicate key errors
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = NEW.id
  ) INTO user_exists;
  
  -- Only proceed if user doesn't exist
  IF NOT user_exists THEN
    -- Get the role from metadata or default to client
    new_role := COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'client'::user_role
    );
    
    -- Insert the user profile with ON CONFLICT DO NOTHING as an extra safety measure
    INSERT INTO public.users (
      id, 
      email, 
      name, 
      role,
      status,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      new_role,
      'active',
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Update user's JWT claims to include role (do this regardless)
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', COALESCE(
      (NEW.raw_user_meta_data->>'role')::text,
      'client'
    ))
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;
/*
  # Create admin user with simplified approach
  
  1. Changes
    - Create admin user with email admin@admin.com and password 'password'
    - Uses a simpler approach with explicit error handling
*/

-- Create admin user function
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void AS $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Only proceed if the email doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@admin.com') THEN
    -- Create auth user
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      aud,
      role,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      last_sign_in_at
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@admin.com',
      crypt('password', gen_salt('bf')),
      now(),
      'authenticated',
      'authenticated',
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"name": "Admin User"}'::jsonb,
      now(),
      now(),
      now()
    );

    -- Create user profile
    INSERT INTO public.users (id, email, name, role)
    VALUES (
      new_user_id,
      'admin@admin.com',
      'Admin User',
      'admin'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT create_admin_user();

-- Clean up
DROP FUNCTION IF EXISTS create_admin_user();
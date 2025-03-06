/*
  # Create new admin user

  1. Changes
    - Create admin user with email admin@admin.com and password 'password'
*/

DO $$
DECLARE
  new_user_id uuid;
  existing_auth_user uuid;
BEGIN
  -- Check if the user already exists in auth.users
  SELECT id INTO existing_auth_user 
  FROM auth.users 
  WHERE email = 'admin@admin.com';

  IF existing_auth_user IS NULL THEN
    -- Create new user if doesn't exist
    new_user_id := gen_random_uuid();
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      new_user_id,
      'authenticated',
      'authenticated',
      'admin@admin.com',
      crypt('password', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
      '{"name":"Admin User","role":"admin"}'::jsonb,
      now(),
      now()
    );

    -- Insert into public.users
    INSERT INTO public.users (id, email, name, role)
    VALUES (
      new_user_id,
      'admin@admin.com',
      'Admin User',
      'admin'
    );
  END IF;
END $$;
/*
  # Fix Superadmin User Creation

  1. Fixes the duplicate key error when creating the superadmin user
  2. Uses a more robust approach to check for and create the superadmin user
*/

-- Create a superadmin user if it doesn't exist using a more robust approach
DO $$
DECLARE
  superadmin_id uuid;
  superadmin_exists boolean;
  auth_user_id uuid;
BEGIN
  -- Check if superadmin already exists in auth.users
  SELECT id INTO auth_user_id
  FROM auth.users 
  WHERE email = 'superadmin@autodetail.com'
  LIMIT 1;
  
  -- If auth user exists, check if profile exists
  IF auth_user_id IS NOT NULL THEN
    -- Check if profile exists
    SELECT EXISTS (
      SELECT 1 FROM public.users WHERE id = auth_user_id
    ) INTO superadmin_exists;
    
    -- If profile doesn't exist, create it
    IF NOT superadmin_exists THEN
      INSERT INTO public.users (
        id,
        email,
        name,
        role,
        status,
        permissions_level,
        created_at,
        updated_at
      )
      VALUES (
        auth_user_id,
        'superadmin@autodetail.com',
        'System Administrator',
        'admin',
        'active',
        'super_admin',
        now(),
        now()
      );
    END IF;
  ELSE
    -- Create new auth user and profile
    -- Generate a new UUID for the user
    superadmin_id := gen_random_uuid();
    
    -- Create the auth user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      superadmin_id,
      'authenticated',
      'authenticated',
      'superadmin@autodetail.com',
      crypt('SuperAdmin@2025', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
      '{"name":"System Administrator","role":"admin"}'::jsonb,
      now(),
      now()
    );
    
    -- Create the profile
    INSERT INTO public.users (
      id,
      email,
      name,
      role,
      status,
      permissions_level,
      created_at,
      updated_at
    )
    VALUES (
      superadmin_id,
      'superadmin@autodetail.com',
      'System Administrator',
      'admin',
      'active',
      'super_admin',
      now(),
      now()
    );
  END IF;
END $$;
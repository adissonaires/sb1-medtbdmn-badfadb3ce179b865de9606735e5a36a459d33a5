/*
  # Fix admin user creation
  
  1. Changes
    - Properly handle existing users
    - Check both auth and public tables
    - Update user if exists, create if doesn't
*/

DO $$
DECLARE
  new_user_id uuid;
  existing_user_id uuid;
BEGIN
  -- First check if user exists in public.users
  SELECT id INTO existing_user_id
  FROM public.users
  WHERE email = 'admin@admin.com';
  
  IF existing_user_id IS NULL THEN
    -- Check auth.users table
    SELECT id INTO existing_user_id
    FROM auth.users
    WHERE email = 'admin@admin.com';
  END IF;

  IF existing_user_id IS NULL THEN
    -- User doesn't exist anywhere, create new
    new_user_id := gen_random_uuid();
    
    -- Insert into auth.users
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
      '{"provider": "email", "providers": ["email"], "role": "admin"}'::jsonb,
      '{"name": "Admin User", "role": "admin"}'::jsonb,
      now(),
      now(),
      now()
    );

    -- Insert into public.users if not exists
    INSERT INTO public.users (id, email, name, role)
    VALUES (
      new_user_id,
      'admin@admin.com',
      'Admin User',
      'admin'
    )
    ON CONFLICT (id) DO NOTHING;
    
  ELSE
    -- User exists, update their role to admin if needed
    UPDATE public.users
    SET role = 'admin'
    WHERE id = existing_user_id
    AND role != 'admin';
    
    -- Update auth user password if exists in auth.users
    UPDATE auth.users
    SET 
      encrypted_password = crypt('password', gen_salt('bf')),
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb,
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb,
      updated_at = now()
    WHERE id = existing_user_id;
  END IF;
END $$;
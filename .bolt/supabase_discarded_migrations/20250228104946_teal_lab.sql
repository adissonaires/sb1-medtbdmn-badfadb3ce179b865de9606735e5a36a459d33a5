/*
  # Create Superadmin User

  1. Creates a superadmin user with full system access
  2. Sets appropriate permissions and role
*/

-- Create a superadmin user if it doesn't exist
DO $$
DECLARE
  superadmin_id uuid;
  superadmin_exists boolean;
BEGIN
  -- Check if superadmin already exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'superadmin@autodetail.com'
  ) INTO superadmin_exists;

  IF NOT superadmin_exists THEN
    -- Create the superadmin user in auth.users
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
      gen_random_uuid(),
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
    )
    RETURNING id INTO superadmin_id;

    -- Create the superadmin profile in public.users
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
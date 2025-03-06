/*
  # Rollback admin user creation issues

  1. Changes
     - Fix duplicate key violations by modifying the handle_new_user function
     - Remove any problematic admin user entries
     - Update the trigger to use ON CONFLICT DO NOTHING
*/

-- First, update the handle_new_user function to prevent duplicate key errors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_role user_role;
BEGIN
  -- Get the role from metadata or default to client
  new_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'client'::user_role
  );
  
  -- Insert the user profile with ON CONFLICT DO NOTHING to prevent duplicate key errors
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    new_role
  )
  ON CONFLICT (id) DO NOTHING;

  -- Update user's JWT claims to include role
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', new_role)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Remove any problematic admin user entries that might be causing conflicts
DO $$
BEGIN
  -- Delete any duplicate admin users that might be causing issues
  DELETE FROM users
  WHERE email = 'admin@admin.com' AND id IN (
    SELECT id FROM users WHERE email = 'admin@admin.com'
    EXCEPT
    SELECT id FROM auth.users WHERE email = 'admin@admin.com'
  );
END $$;
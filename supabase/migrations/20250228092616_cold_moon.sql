-- Improve the handle_new_user function to be more robust
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
    INSERT INTO public.users (id, email, name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      new_role
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

-- Ensure the trigger is properly set
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Fix any existing users that might be missing profiles
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  -- Loop through auth users and ensure they have profiles
  FOR auth_user IN 
    SELECT au.id, au.email, au.raw_user_meta_data 
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    -- Insert missing user profiles
    INSERT INTO public.users (id, email, name, role)
    VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE(auth_user.raw_user_meta_data->>'name', split_part(auth_user.email, '@', 1)),
      COALESCE((auth_user.raw_user_meta_data->>'role')::user_role, 'client'::user_role)
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;
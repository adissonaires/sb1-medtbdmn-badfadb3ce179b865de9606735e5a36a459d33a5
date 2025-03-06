/*
  # Fix user creation to handle duplicates

  1. Changes
    - Update handle_new_user function to use ON CONFLICT DO UPDATE
    - Ensure user profile is properly updated when auth user already exists

  2. Security
    - Maintains existing RLS policies
    - No changes to security model
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER SECURITY DEFINER AS $$
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
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
/*
  # Update admin user password

  1. Changes
    - Update password for admin@test.com to 'abc@123'
*/

DO $$
BEGIN
  -- Update password for existing admin user
  UPDATE auth.users
  SET encrypted_password = crypt('abc@123', gen_salt('bf'))
  WHERE email = 'admin@test.com';
END $$;
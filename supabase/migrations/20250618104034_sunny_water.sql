/*
  # Safe Verification Columns Fix

  1. Changes
    - Safely add email_verified and phone_verified columns if they don't exist
    - Ensure phone_verifications table exists
    - Only create policies that don't already exist

  2. Security
    - Check for existing policies before creating new ones
    - Maintain existing RLS setup
*/

-- Safely add email_verified column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_verified BOOLEAN DEFAULT true;
    RAISE NOTICE 'Added email_verified column to profiles table';
  ELSE
    RAISE NOTICE 'email_verified column already exists in profiles table';
  END IF;
END $$;

-- Safely add phone_verified column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verified BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added phone_verified column to profiles table';
  ELSE
    RAISE NOTICE 'phone_verified column already exists in profiles table';
  END IF;
END $$;

-- Ensure phone_verifications table exists (safe to run multiple times)
CREATE TABLE IF NOT EXISTS phone_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone text NOT NULL,
  code text NOT NULL,
  verified boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on phone_verifications (safe to run multiple times)
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Only create policies if they don't exist
DO $$
BEGIN
  -- Check and create phone verification policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'phone_verifications' 
    AND policyname = 'Users can read own phone verifications'
  ) THEN
    CREATE POLICY "Users can read own phone verifications" ON phone_verifications 
      FOR SELECT USING (auth.uid() = user_id);
    RAISE NOTICE 'Created policy: Users can read own phone verifications';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'phone_verifications' 
    AND policyname = 'Users can insert own phone verifications'
  ) THEN
    CREATE POLICY "Users can insert own phone verifications" ON phone_verifications 
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    RAISE NOTICE 'Created policy: Users can insert own phone verifications';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'phone_verifications' 
    AND policyname = 'Users can update own phone verifications'
  ) THEN
    CREATE POLICY "Users can update own phone verifications" ON phone_verifications 
      FOR UPDATE USING (auth.uid() = user_id);
    RAISE NOTICE 'Created policy: Users can update own phone verifications';
  END IF;
END $$;

-- Create indexes if they don't exist (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id ON phone_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_code ON phone_verifications(code);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at ON phone_verifications(expires_at);

-- Update existing profiles to have email_verified = true (for existing Google users)
UPDATE profiles 
SET email_verified = true 
WHERE email_verified IS NULL OR email_verified = false;

-- Function to clean up expired verification codes (safe to run multiple times)
CREATE OR REPLACE FUNCTION cleanup_expired_phone_verifications()
RETURNS void AS $$
BEGIN
  DELETE FROM phone_verifications 
  WHERE expires_at < now() AND verified = false;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON phone_verifications TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
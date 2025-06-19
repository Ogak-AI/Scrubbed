/*
  # Fix Missing Verification Columns

  1. Changes
    - Ensure `email_verified` and `phone_verified` columns exist in profiles table
    - Add default values for existing records
    - Update any missing indexes

  2. Safety
    - Uses IF NOT EXISTS to prevent errors if columns already exist
    - Safe for re-running multiple times
*/

-- Add email_verified column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_verified BOOLEAN DEFAULT false;
    
    -- Set default to true for existing users (they're already signed in)
    UPDATE profiles SET email_verified = true WHERE email_verified IS NULL;
  END IF;
END $$;

-- Add phone_verified column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Ensure phone_verifications table exists
CREATE TABLE IF NOT EXISTS phone_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone text NOT NULL,
  code text NOT NULL,
  verified boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on phone_verifications if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'phone_verifications' 
    AND policyname = 'Users can read own phone verifications'
  ) THEN
    ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can read own phone verifications" ON phone_verifications 
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own phone verifications" ON phone_verifications 
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own phone verifications" ON phone_verifications 
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id ON phone_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_code ON phone_verifications(code);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at ON phone_verifications(expires_at);

-- Function to clean up expired verification codes
CREATE OR REPLACE FUNCTION cleanup_expired_phone_verifications()
RETURNS void AS $$
BEGIN
  DELETE FROM phone_verifications 
  WHERE expires_at < now() AND verified = false;
END;
$$ LANGUAGE plpgsql;
/*
  # Add Verification System

  1. New Tables
    - `phone_verifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `phone` (text)
      - `code` (text)
      - `verified` (boolean)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Changes
    - Add `email_verified` and `phone_verified` columns to `profiles` table

  3. Security
    - Enable RLS on `phone_verifications` table
    - Add policies for users to manage their own verification records
*/

-- Add verification columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create phone_verifications table
CREATE TABLE IF NOT EXISTS phone_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone text NOT NULL,
  code text NOT NULL,
  verified boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on phone_verifications
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for phone_verifications
CREATE POLICY "Users can read own phone verifications" ON phone_verifications 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own phone verifications" ON phone_verifications 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phone verifications" ON phone_verifications 
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
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

-- Create a trigger to automatically clean up expired codes (optional)
-- This would typically be run as a scheduled job in production
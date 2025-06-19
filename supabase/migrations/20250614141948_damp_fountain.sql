/*
  # Initial Database Schema for Scrubbed Platform

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text, nullable)
      - `user_type` (text, check constraint for dumper/collector/admin)
      - `phone` (text, nullable)
      - `address` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `collectors`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `specializations` (text array)
      - `service_radius` (integer)
      - `is_available` (boolean)
      - `current_location` (jsonb)
      - `rating` (decimal)
      - `total_collections` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `waste_requests`
      - `id` (uuid, primary key)
      - `dumper_id` (uuid, references profiles)
      - `collector_id` (uuid, references profiles, nullable)
      - `waste_type` (text)
      - `description` (text, nullable)
      - `location` (jsonb)
      - `address` (text)
      - `status` (text, check constraint)
      - `scheduled_time` (timestamptz, nullable)
      - `estimated_amount` (text, nullable)
      - `photos` (text array, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Collectors can read their own collector data
    - Users can read/update their own requests
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text,
  user_type text CHECK (user_type IN ('dumper', 'collector', 'admin')) NOT NULL DEFAULT 'dumper',
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create collectors table
CREATE TABLE IF NOT EXISTS collectors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  specializations text[] DEFAULT '{}',
  service_radius integer DEFAULT 10,
  is_available boolean DEFAULT true,
  current_location jsonb,
  rating decimal(3,2),
  total_collections integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create waste_requests table
CREATE TABLE IF NOT EXISTS waste_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dumper_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  collector_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  waste_type text NOT NULL,
  description text,
  location jsonb NOT NULL,
  address text NOT NULL,
  status text CHECK (status IN ('pending', 'matched', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  scheduled_time timestamptz,
  estimated_amount text,
  photos text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can read own profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for collectors
CREATE POLICY "Collectors can read own data" ON collectors 
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Collectors can update own data" ON collectors 
  FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "Collectors can insert own data" ON collectors 
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Public can read available collectors" ON collectors 
  FOR SELECT USING (is_available = true);

-- RLS Policies for waste_requests
CREATE POLICY "Users can read own requests" ON waste_requests 
  FOR SELECT USING (dumper_id = auth.uid() OR collector_id = auth.uid());

CREATE POLICY "Dumpers can create requests" ON waste_requests 
  FOR INSERT WITH CHECK (dumper_id = auth.uid());

CREATE POLICY "Users can update own requests" ON waste_requests 
  FOR UPDATE USING (dumper_id = auth.uid() OR collector_id = auth.uid());

CREATE POLICY "Collectors can view pending requests" ON waste_requests 
  FOR SELECT USING (status = 'pending');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_collectors_available ON collectors(is_available);
CREATE INDEX IF NOT EXISTS idx_collectors_profile_id ON collectors(profile_id);
CREATE INDEX IF NOT EXISTS idx_waste_requests_status ON waste_requests(status);
CREATE INDEX IF NOT EXISTS idx_waste_requests_dumper_id ON waste_requests(dumper_id);
CREATE INDEX IF NOT EXISTS idx_waste_requests_collector_id ON waste_requests(collector_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collectors_updated_at BEFORE UPDATE ON collectors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waste_requests_updated_at BEFORE UPDATE ON waste_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
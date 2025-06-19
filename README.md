# Scrubbed - Smart Waste Management Platform

A modern waste management platform that connects users with professional waste collectors using real-time geolocation matching, powered by Supabase.

## Features

- **Real-time Geolocation Matching**: Automatically matches users with nearby collectors
- **Supabase Authentication**: Secure email/password authentication with user profiles
- **Email & SMS Verification**: Real-time OTP verification for both email and phone numbers
- **Database & Storage**: Full-featured database with real-time updates
- **Dual User Types**: Support for waste dumpers, collectors, and administrators
- **Live Location Tracking**: Real-time location updates for optimal matching
- **Responsive Design**: Beautiful, production-ready interface

## Setup Instructions

### 1. Supabase Configuration

To set up the database and authentication:

1. Go to [Supabase](https://supabase.com) and create a new project
2. Copy your project URL and anon key from the project settings
3. Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. SMS Configuration (Optional)

For real SMS delivery, add these environment variables to your Supabase project:

1. Go to your Supabase project settings → Edge Functions → Environment Variables
2. Add the following variables:

```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

**Note**: Without Twilio configuration, the system will work in development mode and show verification codes in the console/alerts.

### 3. Database Setup

Click the "Connect to Supabase" button in the top right to set up the database schema automatically, or run the following SQL in your Supabase SQL editor:

```sql
-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  user_type TEXT CHECK (user_type IN ('dumper', 'collector', 'admin')) NOT NULL DEFAULT 'dumper',
  phone TEXT,
  address TEXT,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create phone_verifications table
CREATE TABLE phone_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create collectors table
CREATE TABLE collectors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  specializations TEXT[] DEFAULT '{}',
  service_radius INTEGER DEFAULT 10,
  is_available BOOLEAN DEFAULT true,
  current_location JSONB,
  rating DECIMAL(3,2),
  total_collections INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create waste_requests table
CREATE TABLE waste_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dumper_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  collector_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  waste_type TEXT NOT NULL,
  description TEXT,
  location JSONB NOT NULL,
  address TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'matched', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  scheduled_time TIMESTAMPTZ,
  estimated_amount TEXT,
  photos TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own phone verifications" ON phone_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own phone verifications" ON phone_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own phone verifications" ON phone_verifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Collectors can read own data" ON collectors FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Collectors can update own data" ON collectors FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "Collectors can insert own data" ON collectors FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can read own requests" ON waste_requests FOR SELECT USING (dumper_id = auth.uid() OR collector_id = auth.uid());
CREATE POLICY "Dumpers can create requests" ON waste_requests FOR INSERT WITH CHECK (dumper_id = auth.uid());
CREATE POLICY "Users can update own requests" ON waste_requests FOR UPDATE USING (dumper_id = auth.uid() OR collector_id = auth.uid());
```

### 4. Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 5. Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, Authentication, Storage, Edge Functions)
- **Real-time**: Supabase Realtime for live updates
- **SMS Service**: Twilio integration via Supabase Edge Functions
- **Geolocation**: Browser Geolocation API with real-time updates
- **State Management**: React Context API
- **Icons**: Lucide React
- **Build Tool**: Vite

## Key Components

### Authentication & Verification
- **Email/Password Authentication**: Secure authentication with Supabase Auth
- **Email Verification**: Built-in email confirmation system
- **SMS Verification**: Real-time OTP delivery via Twilio
- **User Profiles**: Comprehensive user management with role-based access

### Core Features
- **Real-time Geolocation**: Uses browser APIs for accurate location tracking
- **Collector Matching**: Intelligent matching based on location, specialization, and availability
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Responsive Design**: Mobile-first approach with beautiful UI/UX

## Database Schema

### Tables

- **profiles**: User profiles with role-based access and verification status
- **phone_verifications**: SMS verification codes with expiration
- **collectors**: Extended data for waste collectors (specializations, availability, location)
- **waste_requests**: Waste collection requests with status tracking

### Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Proper authentication required for all operations
- Time-limited verification codes

## SMS Integration

The platform uses Supabase Edge Functions to send real-time SMS verification codes:

### Development Mode
- Verification codes are displayed in console/alerts
- No SMS service required for testing

### Production Mode
- Integrates with Twilio for SMS delivery
- Secure code generation and delivery
- Automatic cleanup of expired codes

### Supported SMS Providers
- **Twilio** (Primary)
- **AWS SNS** (Can be configured)
- **SendGrid** (Can be configured)
- **MessageBird** (Can be configured)

## Deployment

The application is configured for deployment on Netlify with automatic builds from your repository.

## Security

- All authentication handled through Supabase Auth
- Row Level Security (RLS) for data protection
- Environment variables for sensitive configuration
- HTTPS required for geolocation features
- Time-limited verification codes
- Secure SMS delivery via Edge Functions

## Browser Support

- Modern browsers with Geolocation API support
- HTTPS required for location features
- JavaScript enabled

## Edge Functions

The platform includes two Edge Functions for SMS verification:

1. **send-sms**: Generates and sends verification codes
2. **verify-phone**: Validates verification codes and updates user status

These functions are automatically deployed to Supabase and handle all SMS-related operations securely.
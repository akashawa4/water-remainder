/*
  # Hydration Tracking App Schema

  ## Overview
  This migration creates the core database structure for a personal hydration tracking application
  that helps users monitor their daily water intake, set personalized goals, and receive reminders.

  ## New Tables

  ### `user_profiles`
  Stores user information and preferences for personalized hydration calculations
  - `id` (uuid, primary key) - Unique identifier for each user
  - `name` (text) - User's display name
  - `age` (integer) - User's age in years
  - `weight` (numeric) - User's weight in kilograms (used for hydration calculations)
  - `height` (numeric) - User's height in centimeters
  - `activity_level` (text) - Physical activity level: sedentary, light, moderate, active, very_active
  - `daily_target_ml` (integer) - Calculated daily water intake target in milliliters
  - `created_at` (timestamptz) - Timestamp when profile was created
  - `updated_at` (timestamptz) - Timestamp of last profile update

  ### `water_intake_entries`
  Records each instance of water consumption
  - `id` (uuid, primary key) - Unique identifier for each entry
  - `user_id` (uuid, foreign key) - Reference to user_profiles
  - `amount_ml` (integer) - Amount of water consumed in milliliters
  - `source` (text) - Source of the entry (manual, reminder, auto)
  - `timestamp` (timestamptz) - When the water was consumed
  - `created_at` (timestamptz) - When the entry was recorded

  ### `reminder_configs`
  User-specific reminder settings
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Reference to user_profiles (unique)
  - `enabled` (boolean) - Whether reminders are active
  - `interval_minutes` (integer) - How often to remind (in minutes)
  - `start_hour` (integer) - Hour to start reminders (0-23)
  - `end_hour` (integer) - Hour to stop reminders (0-23)
  - `created_at` (timestamptz) - When config was created
  - `updated_at` (timestamptz) - When config was last updated

  ## Security
  
  All tables have Row Level Security (RLS) enabled with the following policies:
  
  ### user_profiles
  - Users can view only their own profile
  - Users can update only their own profile
  - Users can insert their own profile
  
  ### water_intake_entries
  - Users can view only their own entries
  - Users can insert their own entries
  - Users can delete their own entries
  
  ### reminder_configs
  - Users can view only their own config
  - Users can insert their own config
  - Users can update only their own config

  ## Indexes
  - `water_intake_entries`: Indexed on (user_id, timestamp) for efficient daily intake queries
  - `reminder_configs`: Unique index on user_id to ensure one config per user
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  age integer NOT NULL DEFAULT 30,
  weight numeric NOT NULL DEFAULT 70,
  height numeric NOT NULL DEFAULT 170,
  activity_level text NOT NULL DEFAULT 'moderate' CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  daily_target_ml integer NOT NULL DEFAULT 2500,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create water_intake_entries table
CREATE TABLE IF NOT EXISTS water_intake_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount_ml integer NOT NULL CHECK (amount_ml > 0),
  source text NOT NULL DEFAULT 'manual',
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create reminder_configs table
CREATE TABLE IF NOT EXISTS reminder_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  interval_minutes integer NOT NULL DEFAULT 60 CHECK (interval_minutes > 0),
  start_hour integer NOT NULL DEFAULT 8 CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour integer NOT NULL DEFAULT 22 CHECK (end_hour >= 0 AND end_hour <= 23),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_water_intake_user_timestamp ON water_intake_entries(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_reminder_configs_user ON reminder_configs(user_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_intake_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for water_intake_entries
CREATE POLICY "Users can view own entries"
  ON water_intake_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
  ON water_intake_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON water_intake_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for reminder_configs
CREATE POLICY "Users can view own config"
  ON reminder_configs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own config"
  ON reminder_configs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own config"
  ON reminder_configs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
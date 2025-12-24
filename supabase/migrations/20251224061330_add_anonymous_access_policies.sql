/*
  # Add Anonymous Access Policies for Demo Mode

  ## Overview
  This migration adds RLS policies that allow anonymous (unauthenticated) users to access
  the hydration tracking features. This is specifically for demo purposes and development.

  ## Changes
  
  ### user_profiles
  - Add policy to allow anonymous users to view all profiles
  - Add policy to allow anonymous users to insert profiles
  - Add policy to allow anonymous users to update profiles

  ### water_intake_entries  
  - Add policy to allow anonymous users to view entries
  - Add policy to allow anonymous users to insert entries
  - Add policy to allow anonymous users to delete entries

  ### reminder_configs
  - Add policy to allow anonymous users to view configs
  - Add policy to allow anonymous users to insert configs
  - Add policy to allow anonymous users to update configs

  ## Security Note
  These policies provide full access to anonymous users for demo purposes.
  In a production environment, these should be removed or restricted.
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own entries" ON water_intake_entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON water_intake_entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON water_intake_entries;
DROP POLICY IF EXISTS "Users can view own config" ON reminder_configs;
DROP POLICY IF EXISTS "Users can insert own config" ON reminder_configs;
DROP POLICY IF EXISTS "Users can update own config" ON reminder_configs;

-- Add anonymous access policies for user_profiles
CREATE POLICY "Allow anonymous to view profiles"
  ON user_profiles FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous to insert profiles"
  ON user_profiles FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous to update profiles"
  ON user_profiles FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Add anonymous access policies for water_intake_entries
CREATE POLICY "Allow anonymous to view entries"
  ON water_intake_entries FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous to insert entries"
  ON water_intake_entries FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous to delete entries"
  ON water_intake_entries FOR DELETE
  TO anon
  USING (true);

-- Add anonymous access policies for reminder_configs
CREATE POLICY "Allow anonymous to view configs"
  ON reminder_configs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous to insert configs"
  ON reminder_configs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous to update configs"
  ON reminder_configs FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
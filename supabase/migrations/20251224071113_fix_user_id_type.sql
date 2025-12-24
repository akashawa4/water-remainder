/*
  # Fix user ID type

  Change user IDs from UUID to text to support custom user IDs like 'demo-user-123'
  
  Changes:
  - DROP foreign key constraints
  - ALTER water_intake_entries.user_id from uuid to text
  - ALTER reminder_configs.user_id from uuid to text
  - ALTER user_profiles.id from uuid to text
  - RECREATE foreign key constraints
*/

ALTER TABLE water_intake_entries DROP CONSTRAINT IF EXISTS water_intake_entries_user_id_fkey;
ALTER TABLE reminder_configs DROP CONSTRAINT IF EXISTS reminder_configs_user_id_fkey;

ALTER TABLE water_intake_entries ALTER COLUMN user_id SET DATA TYPE text;
ALTER TABLE reminder_configs ALTER COLUMN user_id SET DATA TYPE text;
ALTER TABLE user_profiles ALTER COLUMN id SET DATA TYPE text;

ALTER TABLE water_intake_entries
  ADD CONSTRAINT water_intake_entries_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES user_profiles(id);

ALTER TABLE reminder_configs
  ADD CONSTRAINT reminder_configs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES user_profiles(id);

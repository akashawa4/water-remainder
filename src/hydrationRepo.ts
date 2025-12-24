import { getLocalDB } from './localDB';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  weight: number;
  height: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | 'high';
  dailyTargetMl?: number;
  wakeTime?: string;
  sleepTime?: string;
}

export interface WaterIntakeEntry {
  id: string;
  timestamp: number;
  amountMl: number;
  source: string;
}

export interface ReminderConfig {
  enabled: boolean;
  intervalMinutes: number;
  startHour: number;
  endHour: number;
}

const PROFILE_KEY = 'hydration:profile';
const ENTRIES_KEY = 'hydration:entries';
const REMINDER_CONFIG_KEY = 'hydration:reminder_config';

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const db = getLocalDB();
  await db.set(PROFILE_KEY, profile);
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const db = getLocalDB();
  return db.get<UserProfile>(PROFILE_KEY);
}

export async function saveWaterIntakeEntry(entry: WaterIntakeEntry): Promise<void> {
  const db = getLocalDB();
  const entries = (await db.get<WaterIntakeEntry[]>(ENTRIES_KEY)) || [];
  entries.push(entry);
  await db.set(ENTRIES_KEY, entries);
}

export async function getWaterIntakeEntries(): Promise<WaterIntakeEntry[]> {
  const db = getLocalDB();
  return (await db.get<WaterIntakeEntry[]>(ENTRIES_KEY)) || [];
}

export async function removeWaterIntakeEntry(entryId: string): Promise<void> {
  const db = getLocalDB();
  const entries = (await db.get<WaterIntakeEntry[]>(ENTRIES_KEY)) || [];
  const filtered = entries.filter(e => e.id !== entryId);
  await db.set(ENTRIES_KEY, filtered);
}

export async function saveReminderConfig(config: ReminderConfig): Promise<void> {
  const db = getLocalDB();
  await db.set(REMINDER_CONFIG_KEY, config);
}

export async function getReminderConfig(): Promise<ReminderConfig | null> {
  const db = getLocalDB();
  return db.get<ReminderConfig>(REMINDER_CONFIG_KEY);
}

export async function getTodayIntake(): Promise<number> {
  const entries = await getWaterIntakeEntries();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return entries.reduce((sum, entry) => {
    const entryDate = new Date(entry.timestamp);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate.getTime() === today.getTime() ? sum + entry.amountMl : sum;
  }, 0);
}

export async function clearAllData(): Promise<void> {
  const db = getLocalDB();
  await db.remove(PROFILE_KEY);
  await db.remove(ENTRIES_KEY);
  await db.remove(REMINDER_CONFIG_KEY);
}

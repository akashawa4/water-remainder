import { supabase } from '../lib/supabaseClient';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  weight: number;
  height: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  dailyTargetMl?: number;
}

export interface WaterIntakeEntry {
  id: string;
  timestamp: number;
  amountMl: number;
  source: string;
  userId?: string;
}

export interface ReminderConfig {
  id?: string;
  userId?: string;
  enabled: boolean;
  intervalMinutes: number;
  startHour: number;
  endHour: number;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      id: profile.id,
      name: profile.name,
      age: profile.age,
      weight: profile.weight,
      height: profile.height,
      activity_level: profile.activityLevel,
      daily_target_ml: profile.dailyTargetMl || 2500,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    age: data.age,
    weight: data.weight,
    height: data.height,
    activityLevel: data.activity_level,
    dailyTargetMl: data.daily_target_ml,
  };
}

export async function saveWaterIntakeEntry(entry: WaterIntakeEntry): Promise<void> {
  const { error } = await supabase
    .from('water_intake_entries')
    .insert({
      id: entry.id,
      user_id: entry.userId,
      amount_ml: entry.amountMl,
      source: entry.source,
      timestamp: new Date(entry.timestamp).toISOString(),
    });

  if (error) throw error;
}

export async function getWaterIntakeEntries(userId: string, startDate?: Date): Promise<WaterIntakeEntry[]> {
  let query = supabase
    .from('water_intake_entries')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (startDate) {
    query = query.gte('timestamp', startDate.toISOString());
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data) return [];

  return data.map(entry => ({
    id: entry.id,
    userId: entry.user_id,
    amountMl: entry.amount_ml,
    source: entry.source,
    timestamp: new Date(entry.timestamp).getTime(),
  }));
}

export async function removeWaterIntakeEntry(entryId: string): Promise<void> {
  const { error } = await supabase
    .from('water_intake_entries')
    .delete()
    .eq('id', entryId);

  if (error) throw error;
}

export async function saveReminderConfig(config: ReminderConfig): Promise<void> {
  const existing = await getReminderConfig(config.userId!);

  if (existing) {
    const { error } = await supabase
      .from('reminder_configs')
      .update({
        enabled: config.enabled,
        interval_minutes: config.intervalMinutes,
        start_hour: config.startHour,
        end_hour: config.endHour,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', config.userId);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('reminder_configs')
      .insert({
        user_id: config.userId,
        enabled: config.enabled,
        interval_minutes: config.intervalMinutes,
        start_hour: config.startHour,
        end_hour: config.endHour,
      });

    if (error) throw error;
  }
}

export async function getReminderConfig(userId: string): Promise<ReminderConfig | null> {
  const { data, error } = await supabase
    .from('reminder_configs')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    enabled: data.enabled,
    intervalMinutes: data.interval_minutes,
    startHour: data.start_hour,
    endHour: data.end_hour,
  };
}

export async function getTodayIntake(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entries = await getWaterIntakeEntries(userId, today);
  return entries.reduce((sum, entry) => sum + entry.amountMl, 0);
}

export async function clearAllData(userId: string): Promise<void> {
  await supabase.from('water_intake_entries').delete().eq('user_id', userId);
  await supabase.from('reminder_configs').delete().eq('user_id', userId);
  await supabase.from('user_profiles').delete().eq('id', userId);
}

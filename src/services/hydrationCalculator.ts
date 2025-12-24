type Gender = 'male' | 'female';
type ActivityLevel = 'sedentary' | 'moderate' | 'high';
type Climate = 'temperate' | 'hot';

interface HydrationInput {
  weightKg: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  climate: Climate;
}

export function calculateDailyWaterTarget(input: HydrationInput): number {
  const { weightKg, activityLevel, climate } = input;

  let target = weightKg * 35;

  if (activityLevel === 'moderate') {
    target *= 1.10;
  } else if (activityLevel === 'high') {
    target *= 1.20;
  }

  if (climate === 'hot') {
    target *= 1.15;
  }

  return Math.max(1800, Math.min(6000, Math.round(target)));
}

export async function getNextReminder(userId: string): Promise<string> {
  const now = new Date();
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
  return nextHour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

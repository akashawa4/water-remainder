// Types for input parameters
type Gender = 'male' | 'female';
type ActivityLevel = 'sedentary' | 'moderate' | 'high';
type Climate = 'temperate' | 'hot';

interface HydrationInput {
  weightKg: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  climate: Climate;
}

/**
 * Calculates daily water intake target in milliliters
 */
export function calculateDailyWaterTarget(input: HydrationInput): number {
  const { weightKg, activityLevel, climate } = input;

  // Base calculation: weight × 35 ml
  let target = weightKg * 35;

  // Apply activity level multiplier
  if (activityLevel === 'moderate') {
    target *= 1.10; // +10%
  } else if (activityLevel === 'high') {
    target *= 1.20; // +20%
  }

  // Apply climate adjustment
  if (climate === 'hot') {
    target *= 1.15; // +15%
  }

  // Enforce min/max constraints
  return Math.max(1800, Math.min(6000, Math.round(target)));
}

interface IntakeEntry {
  amount: number; // in milliliters
  timestamp: Date;
}

interface IntakeTrackerResult {
  totalIntake: number;
  remaining: number;
  isTargetMet: boolean;
}

/**
 * Calculates total water intake and remaining target for today
 */
export function trackIntake(
  dailyTarget: number,
  intakeEntries: IntakeEntry[]
): IntakeTrackerResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sum only today's entries
  const totalIntake = intakeEntries.reduce((sum, entry) => {
    const entryDate = new Date(entry.timestamp);
    entryDate.setHours(0, 0, 0, 0);

    return entryDate.getTime() === today.getTime() ? sum + entry.amount : sum;
  }, 0);

  // Calculate remaining (minimum 0)
  const remaining = Math.max(0, dailyTarget - totalIntake);

  return {
    totalIntake,
    remaining,
    isTargetMet: totalIntake >= dailyTarget,
  };
}

export async function getTodayIntake(userId: string): Promise<number> {
  return 1000;
}

export async function addWaterIntake(userId: string, amount: number): Promise<void> {
  return;
}

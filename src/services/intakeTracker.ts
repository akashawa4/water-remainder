interface IntakeEntry {
  amount: number;
  timestamp: Date;
}

interface IntakeTrackerResult {
  totalIntake: number;
  remaining: number;
  isTargetMet: boolean;
}

export function trackIntake(
  dailyTarget: number,
  intakeEntries: IntakeEntry[]
): IntakeTrackerResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalIntake = intakeEntries.reduce((sum, entry) => {
    const entryDate = new Date(entry.timestamp);
    entryDate.setHours(0, 0, 0, 0);

    return entryDate.getTime() === today.getTime() ? sum + entry.amount : sum;
  }, 0);

  const remaining = Math.max(0, dailyTarget - totalIntake);

  return {
    totalIntake,
    remaining,
    isTargetMet: totalIntake >= dailyTarget,
  };
}

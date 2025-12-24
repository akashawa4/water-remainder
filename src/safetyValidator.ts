interface IntakeEntry {
  amount: number;
  timestamp: Date;
}

interface SafetyWarning {
  type: 'rapid_intake' | 'excessive_daily';
  message: string;
  severity: 'warning';
}

export function validateHydrationSafety(
  dailyTarget: number,
  intakeEntries: IntakeEntry[],
  newIntake: number
): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];

  // Check for rapid intake (>1500ml in 60 minutes)
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const recentIntake = intakeEntries.reduce((sum, entry) => {
    return entry.timestamp >= oneHourAgo && entry.timestamp <= now
      ? sum + entry.amount
      : sum;
  }, 0);

  if (recentIntake + newIntake > 1500) {
    warnings.push({
      type: 'rapid_intake',
      message: `Rapid intake detected: ${Math.round(recentIntake + newIntake)}ml in 60 minutes exceeds safe threshold of 1500ml`,
      severity: 'warning',
    });
  }

  // Check for excessive daily intake (>130% of target)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayIntake = intakeEntries.reduce((sum, entry) => {
    const entryDate = new Date(entry.timestamp);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate.getTime() === today.getTime() ? sum + entry.amount : sum;
  }, 0);

  const totalDailyIntake = todayIntake + newIntake;
  const excessiveThreshold = dailyTarget * 1.3;

  if (totalDailyIntake > excessiveThreshold) {
    warnings.push({
      type: 'excessive_daily',
      message: `Daily intake exceeds safe limit: ${Math.round(totalDailyIntake)}ml is above 130% of target (${Math.round(excessiveThreshold)}ml)`,
      severity: 'warning',
    });
  }

  return warnings;
}

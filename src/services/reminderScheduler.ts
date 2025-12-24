interface ReminderScheduleInput {
  weightKg: number;
  wakeTime: string;
  sleepTime: string;
}

interface ReminderSchedule {
  dailyTargetMl: number;
  activeMinutes: number;
  reminderIntervalMinutes: number;
  numberOfReminders: number;
  perReminderAmountMl: number;
  reminders: ScheduledReminder[];
}

interface ScheduledReminder {
  time: string;
  amountMl: number;
  cumulativeTarget: number;
}

interface ReminderCheckResult {
  shouldSend: boolean;
  reason?: 'recent_intake' | 'target_reached' | 'outside_window';
  nextReminderTime?: string;
}

interface SafetyCheck {
  hasWarning: boolean;
  warnings: string[];
}

export function calculateReminderSchedule(input: ReminderScheduleInput): ReminderSchedule {
  const { weightKg, wakeTime, sleepTime } = input;

  const dailyTargetMl = calculateDailyTarget(weightKg);
  const activeMinutes = calculateActiveMinutes(wakeTime, sleepTime);
  const reminderIntervalMinutes = calculateReminderInterval(weightKg);
  const numberOfReminders = Math.floor(activeMinutes / reminderIntervalMinutes);
  const perReminderAmountMl = roundToStandardAmount(dailyTargetMl / numberOfReminders);

  const reminders = generateReminderTimes(
    wakeTime,
    reminderIntervalMinutes,
    numberOfReminders,
    perReminderAmountMl
  );

  return {
    dailyTargetMl,
    activeMinutes,
    reminderIntervalMinutes,
    numberOfReminders,
    perReminderAmountMl,
    reminders,
  };
}

function calculateDailyTarget(weightKg: number): number {
  const target = weightKg * 35;
  return Math.max(1800, Math.min(6000, Math.round(target)));
}

function calculateActiveMinutes(wakeTime: string, sleepTime: string): number {
  const wake = parseTime(wakeTime);
  const sleep = parseTime(sleepTime);

  let activeMinutes = sleep.totalMinutes - wake.totalMinutes;

  if (activeMinutes < 0) {
    activeMinutes += 24 * 60;
  }

  if (activeMinutes === 0) {
    activeMinutes = 24 * 60;
  }

  return activeMinutes;
}

function calculateReminderInterval(weightKg: number): number {
  if (weightKg <= 60) {
    return 60;
  } else if (weightKg <= 80) {
    return 45;
  } else {
    const normalized = Math.min((weightKg - 81) / 30, 1);
    return Math.round(40 - normalized * 10);
  }
}

function roundToStandardAmount(amount: number): number {
  const standardAmounts = [150, 200, 250];

  if (amount <= 150) {
    return 150;
  } else if (amount <= 175) {
    return 150;
  } else if (amount <= 225) {
    return 200;
  } else {
    return 250;
  }
}

function parseTime(time: string): { hours: number; minutes: number; totalMinutes: number } {
  const [hours, minutes] = time.split(':').map(Number);
  return {
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes,
  };
}

function formatTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function generateReminderTimes(
  wakeTime: string,
  intervalMinutes: number,
  numberOfReminders: number,
  perReminderAmountMl: number
): ScheduledReminder[] {
  const wake = parseTime(wakeTime);
  const reminders: ScheduledReminder[] = [];

  for (let i = 0; i < numberOfReminders; i++) {
    const reminderMinutes = wake.totalMinutes + i * intervalMinutes;
    const cumulativeTarget = (i + 1) * perReminderAmountMl;

    reminders.push({
      time: formatTime(reminderMinutes),
      amountMl: perReminderAmountMl,
      cumulativeTarget,
    });
  }

  return reminders;
}

export function shouldSendReminder(
  currentTime: string,
  wakeTime: string,
  sleepTime: string,
  lastIntakeTimestamp: number | null,
  currentIntakeMl: number,
  dailyTargetMl: number
): ReminderCheckResult {
  if (currentIntakeMl >= dailyTargetMl) {
    return {
      shouldSend: false,
      reason: 'target_reached',
    };
  }

  if (!isWithinActiveWindow(currentTime, wakeTime, sleepTime)) {
    return {
      shouldSend: false,
      reason: 'outside_window',
    };
  }

  if (lastIntakeTimestamp !== null) {
    const now = Date.now();
    const timeSinceLastIntakeMinutes = (now - lastIntakeTimestamp) / (1000 * 60);

    if (timeSinceLastIntakeMinutes < 30) {
      return {
        shouldSend: false,
        reason: 'recent_intake',
        nextReminderTime: calculateNextReminderTime(lastIntakeTimestamp, 30),
      };
    }
  }

  return {
    shouldSend: true,
  };
}

function isWithinActiveWindow(currentTime: string, wakeTime: string, sleepTime: string): boolean {
  const current = parseTime(currentTime);
  const wake = parseTime(wakeTime);
  const sleep = parseTime(sleepTime);

  if (wake.totalMinutes < sleep.totalMinutes) {
    return current.totalMinutes >= wake.totalMinutes && current.totalMinutes < sleep.totalMinutes;
  } else {
    return current.totalMinutes >= wake.totalMinutes || current.totalMinutes < sleep.totalMinutes;
  }
}

function calculateNextReminderTime(lastIntakeTimestamp: number, waitMinutes: number): string {
  const nextTime = new Date(lastIntakeTimestamp + waitMinutes * 60 * 1000);
  return `${String(nextTime.getHours()).padStart(2, '0')}:${String(nextTime.getMinutes()).padStart(2, '0')}`;
}

export function getNextScheduledReminder(
  schedule: ReminderSchedule,
  currentTime: string,
  currentIntakeMl: number
): ScheduledReminder | null {
  if (currentIntakeMl >= schedule.dailyTargetMl) {
    return null;
  }

  const current = parseTime(currentTime);

  for (const reminder of schedule.reminders) {
    const reminderTime = parseTime(reminder.time);

    if (reminderTime.totalMinutes >= current.totalMinutes) {
      if (currentIntakeMl < reminder.cumulativeTarget) {
        return reminder;
      }
    }
  }

  return null;
}

export function checkSafetyWarnings(
  currentIntakeMl: number,
  newIntakeMl: number,
  dailyTargetMl: number,
  recentIntakeHistory: { amountMl: number; timestamp: number }[]
): SafetyCheck {
  const warnings: string[] = [];

  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recentIntakeSum = recentIntakeHistory
    .filter(entry => entry.timestamp >= oneHourAgo)
    .reduce((sum, entry) => sum + entry.amountMl, 0);

  const totalRecentIntake = recentIntakeSum + newIntakeMl;
  if (totalRecentIntake > 1500) {
    warnings.push(
      `Warning: Consuming ${totalRecentIntake}ml in 1 hour exceeds safe rapid intake limit (1500ml/hour). ` +
      `Consider spacing out your water intake to avoid water intoxication.`
    );
  }

  const totalDailyIntake = currentIntakeMl + newIntakeMl;
  const excessiveThreshold = dailyTargetMl * 1.3;
  if (totalDailyIntake > excessiveThreshold) {
    warnings.push(
      `Warning: Total intake of ${totalDailyIntake}ml exceeds 130% of your daily target (${Math.round(excessiveThreshold)}ml). ` +
      `Excessive water intake may lead to electrolyte imbalance.`
    );
  }

  const extremeThreshold = 6000;
  if (totalDailyIntake > extremeThreshold) {
    warnings.push(
      `Warning: Intake of ${totalDailyIntake}ml exceeds safe daily maximum (6000ml). ` +
      `This level of consumption requires medical supervision.`
    );
  }

  return {
    hasWarning: warnings.length > 0,
    warnings,
  };
}

export function calculateProgressPercentage(currentIntakeMl: number, dailyTargetMl: number): number {
  return Math.min(100, Math.round((currentIntakeMl / dailyTargetMl) * 100));
}

export function getRemainingReminders(
  schedule: ReminderSchedule,
  currentTime: string,
  currentIntakeMl: number
): ScheduledReminder[] {
  const current = parseTime(currentTime);

  return schedule.reminders.filter(reminder => {
    const reminderTime = parseTime(reminder.time);
    return (
      reminderTime.totalMinutes > current.totalMinutes &&
      currentIntakeMl < reminder.cumulativeTarget
    );
  });
}

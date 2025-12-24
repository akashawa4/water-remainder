import {
  calculateReminderSchedule,
  shouldSendReminder,
  getNextScheduledReminder,
  checkSafetyWarnings,
  getRemainingReminders,
} from './reminderScheduler';
import {
  getUserProfile,
  getWaterIntakeEntries,
  getTodayIntake,
  saveWaterIntakeEntry,
} from '../repositories/hydrationRepo';

export interface UserReminderSettings {
  wakeTime: string;
  sleepTime: string;
  notificationsEnabled: boolean;
}

export async function initializeRemindersForUser(userId: string, settings: UserReminderSettings) {
  const profile = await getUserProfile(userId);

  if (!profile) {
    throw new Error('User profile not found');
  }

  const schedule = calculateReminderSchedule({
    weightKg: profile.weight,
    wakeTime: settings.wakeTime,
    sleepTime: settings.sleepTime,
  });

  console.log('Reminder schedule initialized for user:', userId);
  console.log('Daily target:', schedule.dailyTargetMl, 'ml');
  console.log('Reminders:', schedule.numberOfReminders, 'times per day');
  console.log('Amount per reminder:', schedule.perReminderAmountMl, 'ml');
  console.log('Interval:', schedule.reminderIntervalMinutes, 'minutes');

  return schedule;
}

export async function checkAndSendReminder(
  userId: string,
  settings: UserReminderSettings,
  currentTime: string
) {
  if (!settings.notificationsEnabled) {
    return { sent: false, reason: 'notifications_disabled' };
  }

  const profile = await getUserProfile(userId);
  if (!profile) {
    throw new Error('User profile not found');
  }

  const currentIntake = await getTodayIntake(userId);
  const dailyTarget = profile.dailyTargetMl || 2500;

  const entries = await getWaterIntakeEntries(userId);
  const todayEntries = entries.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    const today = new Date();
    entryDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return entryDate.getTime() === today.getTime();
  });

  const lastIntakeTimestamp = todayEntries.length > 0
    ? Math.max(...todayEntries.map(e => e.timestamp))
    : null;

  const reminderCheck = shouldSendReminder(
    currentTime,
    settings.wakeTime,
    settings.sleepTime,
    lastIntakeTimestamp,
    currentIntake,
    dailyTarget
  );

  if (reminderCheck.shouldSend) {
    const schedule = calculateReminderSchedule({
      weightKg: profile.weight,
      wakeTime: settings.wakeTime,
      sleepTime: settings.sleepTime,
    });

    const nextReminder = getNextScheduledReminder(schedule, currentTime, currentIntake);

    return {
      sent: true,
      reminder: nextReminder,
      message: nextReminder
        ? `Time to drink ${nextReminder.amountMl}ml of water!`
        : 'Stay hydrated!',
    };
  }

  return {
    sent: false,
    reason: reminderCheck.reason,
    nextReminderTime: reminderCheck.nextReminderTime,
  };
}

export async function logWaterWithSafetyCheck(
  userId: string,
  amountMl: number,
  source: string = 'manual'
) {
  const profile = await getUserProfile(userId);
  if (!profile) {
    throw new Error('User profile not found');
  }

  const currentIntake = await getTodayIntake(userId);
  const dailyTarget = profile.dailyTargetMl || 2500;

  const entries = await getWaterIntakeEntries(userId);
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recentHistory = entries
    .filter(entry => entry.timestamp >= oneHourAgo)
    .map(entry => ({
      amountMl: entry.amountMl,
      timestamp: entry.timestamp,
    }));

  const safetyCheck = checkSafetyWarnings(
    currentIntake,
    amountMl,
    dailyTarget,
    recentHistory
  );

  await saveWaterIntakeEntry({
    id: crypto.randomUUID(),
    userId,
    timestamp: Date.now(),
    amountMl,
    source,
  });

  return {
    success: true,
    newTotal: currentIntake + amountMl,
    targetMet: (currentIntake + amountMl) >= dailyTarget,
    safetyWarnings: safetyCheck.warnings,
  };
}

export async function getDailyProgress(userId: string, settings: UserReminderSettings) {
  const profile = await getUserProfile(userId);
  if (!profile) {
    throw new Error('User profile not found');
  }

  const currentIntake = await getTodayIntake(userId);
  const dailyTarget = profile.dailyTargetMl || 2500;

  const schedule = calculateReminderSchedule({
    weightKg: profile.weight,
    wakeTime: settings.wakeTime,
    sleepTime: settings.sleepTime,
  });

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const remaining = getRemainingReminders(schedule, currentTime, currentIntake);
  const nextReminder = getNextScheduledReminder(schedule, currentTime, currentIntake);

  const percentage = Math.min(100, Math.round((currentIntake / dailyTarget) * 100));

  return {
    currentIntake,
    dailyTarget,
    remaining: Math.max(0, dailyTarget - currentIntake),
    percentage,
    targetMet: currentIntake >= dailyTarget,
    nextReminder: nextReminder
      ? {
          time: nextReminder.time,
          amount: nextReminder.amountMl,
        }
      : null,
    remainingRemindersCount: remaining.length,
    totalRemindersToday: schedule.numberOfReminders,
  };
}

export async function getDetailedSchedule(userId: string, settings: UserReminderSettings) {
  const profile = await getUserProfile(userId);
  if (!profile) {
    throw new Error('User profile not found');
  }

  const schedule = calculateReminderSchedule({
    weightKg: profile.weight,
    wakeTime: settings.wakeTime,
    sleepTime: settings.sleepTime,
  });

  const currentIntake = await getTodayIntake(userId);

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const remindersWithStatus = schedule.reminders.map(reminder => ({
    time: reminder.time,
    amount: reminder.amountMl,
    cumulativeTarget: reminder.cumulativeTarget,
    completed: currentIntake >= reminder.cumulativeTarget,
    isPast: reminder.time < currentTime,
  }));

  return {
    schedule,
    remindersWithStatus,
    summary: {
      totalReminders: schedule.numberOfReminders,
      completed: remindersWithStatus.filter(r => r.completed).length,
      pending: remindersWithStatus.filter(r => !r.completed && !r.isPast).length,
      missed: remindersWithStatus.filter(r => !r.completed && r.isPast).length,
    },
  };
}

console.log(`
=== Integration Example ===

This file demonstrates how to integrate the reminder scheduler logic
with the existing hydration repository.

Key Functions:
1. initializeRemindersForUser() - Set up reminders on app start
2. checkAndSendReminder() - Check if reminder should be sent (call every minute)
3. logWaterWithSafetyCheck() - Log water with automatic safety validation
4. getDailyProgress() - Get real-time progress and next reminder
5. getDetailedSchedule() - Get full schedule with completion status

Usage Pattern:
1. When user sets wake/sleep times, call initializeRemindersForUser()
2. Set up a timer to call checkAndSendReminder() every minute
3. When user logs water, call logWaterWithSafetyCheck()
4. Display getDailyProgress() on home screen
5. Show getDetailedSchedule() in a schedule view
`);

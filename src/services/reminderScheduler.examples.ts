import {
  calculateReminderSchedule,
  shouldSendReminder,
  getNextScheduledReminder,
  checkSafetyWarnings,
  calculateProgressPercentage,
  getRemainingReminders,
} from './reminderScheduler';

console.log('=== Water Reminder Scheduler Examples ===\n');

console.log('--- Example 1: Light Person (55kg) ---');
const schedule1 = calculateReminderSchedule({
  weightKg: 55,
  wakeTime: '07:00',
  sleepTime: '23:00',
});
console.log('Daily Target:', schedule1.dailyTargetMl, 'ml');
console.log('Active Window:', schedule1.activeMinutes, 'minutes (16 hours)');
console.log('Reminder Interval:', schedule1.reminderIntervalMinutes, 'minutes');
console.log('Number of Reminders:', schedule1.numberOfReminders);
console.log('Per-Reminder Amount:', schedule1.perReminderAmountMl, 'ml');
console.log('First 5 Reminders:');
schedule1.reminders.slice(0, 5).forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.time} - ${r.amountMl}ml (cumulative: ${r.cumulativeTarget}ml)`);
});
console.log();

console.log('--- Example 2: Medium Person (70kg) ---');
const schedule2 = calculateReminderSchedule({
  weightKg: 70,
  wakeTime: '06:30',
  sleepTime: '22:30',
});
console.log('Daily Target:', schedule2.dailyTargetMl, 'ml');
console.log('Active Window:', schedule2.activeMinutes, 'minutes (16 hours)');
console.log('Reminder Interval:', schedule2.reminderIntervalMinutes, 'minutes');
console.log('Number of Reminders:', schedule2.numberOfReminders);
console.log('Per-Reminder Amount:', schedule2.perReminderAmountMl, 'ml');
console.log('First 5 Reminders:');
schedule2.reminders.slice(0, 5).forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.time} - ${r.amountMl}ml (cumulative: ${r.cumulativeTarget}ml)`);
});
console.log();

console.log('--- Example 3: Heavy Person (95kg) ---');
const schedule3 = calculateReminderSchedule({
  weightKg: 95,
  wakeTime: '05:30',
  sleepTime: '22:00',
});
console.log('Daily Target:', schedule3.dailyTargetMl, 'ml');
console.log('Active Window:', schedule3.activeMinutes, 'minutes (16.5 hours)');
console.log('Reminder Interval:', schedule3.reminderIntervalMinutes, 'minutes');
console.log('Number of Reminders:', schedule3.numberOfReminders);
console.log('Per-Reminder Amount:', schedule3.perReminderAmountMl, 'ml');
console.log('First 5 Reminders:');
schedule3.reminders.slice(0, 5).forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.time} - ${r.amountMl}ml (cumulative: ${r.cumulativeTarget}ml)`);
});
console.log();

console.log('--- Example 4: Should Send Reminder Checks ---');
const check1 = shouldSendReminder('08:00', '07:00', '23:00', null, 500, 2450);
console.log('At 08:00, no recent intake, 500ml consumed:');
console.log('  Should Send:', check1.shouldSend);

const recentIntakeTimestamp = Date.now() - 15 * 60 * 1000;
const check2 = shouldSendReminder('10:00', '07:00', '23:00', recentIntakeTimestamp, 800, 2450);
console.log('\nAt 10:00, drank 15 min ago, 800ml consumed:');
console.log('  Should Send:', check2.shouldSend);
console.log('  Reason:', check2.reason);
console.log('  Next Reminder Time:', check2.nextReminderTime);

const check3 = shouldSendReminder('10:00', '07:00', '23:00', null, 2500, 2450);
console.log('\nAt 10:00, target reached (2500/2450ml):');
console.log('  Should Send:', check3.shouldSend);
console.log('  Reason:', check3.reason);

const check4 = shouldSendReminder('23:30', '07:00', '23:00', null, 1500, 2450);
console.log('\nAt 23:30 (outside active window):');
console.log('  Should Send:', check4.shouldSend);
console.log('  Reason:', check4.reason);
console.log();

console.log('--- Example 5: Next Scheduled Reminder ---');
const nextReminder = getNextScheduledReminder(schedule2, '09:30', 400);
console.log('Current time: 09:30, consumed: 400ml');
if (nextReminder) {
  console.log('  Next Reminder:', nextReminder.time);
  console.log('  Amount:', nextReminder.amountMl, 'ml');
  console.log('  Cumulative Target:', nextReminder.cumulativeTarget, 'ml');
}
console.log();

console.log('--- Example 6: Safety Warnings ---');
const recentHistory1 = [
  { amountMl: 500, timestamp: Date.now() - 40 * 60 * 1000 },
  { amountMl: 600, timestamp: Date.now() - 20 * 60 * 1000 },
];
const safety1 = checkSafetyWarnings(1100, 600, 2450, recentHistory1);
console.log('New intake: 600ml, recent hour: 1200ml, total: 1800ml');
console.log('  Has Warning:', safety1.hasWarning);
safety1.warnings.forEach(w => console.log('  -', w));
console.log();

const recentHistory2 = [
  { amountMl: 300, timestamp: Date.now() - 50 * 60 * 1000 },
];
const safety2 = checkSafetyWarnings(3000, 250, 2450, recentHistory2);
console.log('New intake: 250ml, current total: 3000ml, target: 2450ml');
console.log('  Has Warning:', safety2.hasWarning);
safety2.warnings.forEach(w => console.log('  -', w));
console.log();

console.log('--- Example 7: Progress Tracking ---');
const progress1 = calculateProgressPercentage(1200, 2450);
console.log('Consumed 1200ml of 2450ml:', progress1 + '%');

const progress2 = calculateProgressPercentage(2450, 2450);
console.log('Consumed 2450ml of 2450ml:', progress2 + '%');

const progress3 = calculateProgressPercentage(2800, 2450);
console.log('Consumed 2800ml of 2450ml:', progress3 + '%');
console.log();

console.log('--- Example 8: Remaining Reminders ---');
const remaining = getRemainingReminders(schedule2, '12:00', 1000);
console.log(`Remaining reminders from 12:00 with 1000ml consumed: ${remaining.length}`);
remaining.slice(0, 3).forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.time} - ${r.amountMl}ml (target: ${r.cumulativeTarget}ml)`);
});
console.log();

console.log('--- Example 9: Night Shift Worker (overnight active window) ---');
const schedule4 = calculateReminderSchedule({
  weightKg: 75,
  wakeTime: '22:00',
  sleepTime: '14:00',
});
console.log('Daily Target:', schedule4.dailyTargetMl, 'ml');
console.log('Active Window:', schedule4.activeMinutes, 'minutes (16 hours)');
console.log('Reminder Interval:', schedule4.reminderIntervalMinutes, 'minutes');
console.log('First 5 Reminders:');
schedule4.reminders.slice(0, 5).forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.time} - ${r.amountMl}ml`);
});
console.log();

console.log('--- Example 10: Edge Cases ---');
console.log('\nVery light person (45kg):');
const scheduleLight = calculateReminderSchedule({
  weightKg: 45,
  wakeTime: '08:00',
  sleepTime: '22:00',
});
console.log('  Target:', scheduleLight.dailyTargetMl, 'ml (min enforced: 1800ml)');
console.log('  Interval:', scheduleLight.reminderIntervalMinutes, 'min');
console.log('  Per-reminder:', scheduleLight.perReminderAmountMl, 'ml');

console.log('\nVery heavy person (180kg):');
const scheduleHeavy = calculateReminderSchedule({
  weightKg: 180,
  wakeTime: '06:00',
  sleepTime: '23:00',
});
console.log('  Target:', scheduleHeavy.dailyTargetMl, 'ml (max enforced: 6000ml)');
console.log('  Interval:', scheduleHeavy.reminderIntervalMinutes, 'min');
console.log('  Per-reminder:', scheduleHeavy.perReminderAmountMl, 'ml');

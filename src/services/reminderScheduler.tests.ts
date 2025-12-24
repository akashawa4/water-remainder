import {
  calculateReminderSchedule,
  shouldSendReminder,
  getNextScheduledReminder,
  checkSafetyWarnings,
  getRemainingReminders,
} from './reminderScheduler';

interface TestResult {
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
}

const results: TestResult[] = [];

function test(name: string, expected: any, actual: any) {
  const passed = JSON.stringify(expected) === JSON.stringify(actual);
  results.push({ name, passed, expected, actual });
}

console.log('Running Water Reminder Scheduler Tests\n');

const schedule60kg = calculateReminderSchedule({
  weightKg: 60,
  wakeTime: '07:00',
  sleepTime: '23:00',
});
test(
  'Test 1: 60kg person interval',
  60,
  schedule60kg.reminderIntervalMinutes
);
test(
  'Test 2: 60kg person target',
  2100,
  schedule60kg.dailyTargetMl
);

const schedule70kg = calculateReminderSchedule({
  weightKg: 70,
  wakeTime: '07:00',
  sleepTime: '23:00',
});
test(
  'Test 3: 70kg person interval',
  45,
  schedule70kg.reminderIntervalMinutes
);

const schedule95kg = calculateReminderSchedule({
  weightKg: 95,
  wakeTime: '07:00',
  sleepTime: '23:00',
});
test(
  'Test 4: 95kg person interval (adaptive)',
  true,
  schedule95kg.reminderIntervalMinutes >= 30 && schedule95kg.reminderIntervalMinutes <= 40
);

const scheduleMinWeight = calculateReminderSchedule({
  weightKg: 45,
  wakeTime: '07:00',
  sleepTime: '23:00',
});
test(
  'Test 5: Min weight enforces 1800ml',
  1800,
  scheduleMinWeight.dailyTargetMl
);

const scheduleMaxWeight = calculateReminderSchedule({
  weightKg: 180,
  wakeTime: '07:00',
  sleepTime: '23:00',
});
test(
  'Test 6: Max weight enforces 6000ml',
  6000,
  scheduleMaxWeight.dailyTargetMl
);

const scheduleOvernight = calculateReminderSchedule({
  weightKg: 70,
  wakeTime: '22:00',
  sleepTime: '14:00',
});
test(
  'Test 7: Overnight schedule calculates correct active minutes',
  960,
  scheduleOvernight.activeMinutes
);
test(
  'Test 8: First reminder is at wake time',
  '22:00',
  scheduleOvernight.reminders[0].time
);

const check1 = shouldSendReminder('08:00', '07:00', '23:00', null, 500, 2450);
test(
  'Test 9: Should send when within window, no recent intake',
  true,
  check1.shouldSend
);

const recentTimestamp = Date.now() - 15 * 60 * 1000;
const check2 = shouldSendReminder('10:00', '07:00', '23:00', recentTimestamp, 800, 2450);
test(
  'Test 10: Should not send when drank within 30 min',
  false,
  check2.shouldSend
);
test(
  'Test 11: Reason is recent_intake',
  'recent_intake',
  check2.reason
);

const check3 = shouldSendReminder('10:00', '07:00', '23:00', null, 2500, 2450);
test(
  'Test 12: Should not send when target reached',
  false,
  check3.shouldSend
);
test(
  'Test 13: Reason is target_reached',
  'target_reached',
  check3.reason
);

const check4 = shouldSendReminder('23:30', '07:00', '23:00', null, 1000, 2450);
test(
  'Test 14: Should not send outside active window',
  false,
  check4.shouldSend
);

const check5 = shouldSendReminder('06:30', '07:00', '23:00', null, 1000, 2450);
test(
  'Test 15: Should not send before wake time',
  false,
  check5.shouldSend
);

const recentHistory = [
  { amountMl: 800, timestamp: Date.now() - 30 * 60 * 1000 },
  { amountMl: 500, timestamp: Date.now() - 10 * 60 * 1000 },
];
const safety1 = checkSafetyWarnings(1300, 400, 2450, recentHistory);
test(
  'Test 16: Rapid intake warning triggered (>1500ml/hour)',
  true,
  safety1.hasWarning
);

const safety2 = checkSafetyWarnings(2800, 250, 2450, []);
test(
  'Test 17: Excessive daily warning (>130% of target)',
  true,
  safety2.hasWarning
);

const safety3 = checkSafetyWarnings(1500, 250, 2450, []);
test(
  'Test 18: No warning for normal intake',
  false,
  safety3.hasWarning
);

const testSchedule = calculateReminderSchedule({
  weightKg: 70,
  wakeTime: '06:00',
  sleepTime: '22:00',
});
const nextReminder = getNextScheduledReminder(testSchedule, '08:00', 300);
test(
  'Test 19: Next reminder exists',
  true,
  nextReminder !== null
);
test(
  'Test 20: Next reminder is after current time',
  true,
  nextReminder !== null && nextReminder.time > '08:00'
);

const nextReminderComplete = getNextScheduledReminder(testSchedule, '21:00', testSchedule.dailyTargetMl);
test(
  'Test 21: No next reminder when target reached',
  null,
  nextReminderComplete
);

const remaining = getRemainingReminders(testSchedule, '10:00', 600);
test(
  'Test 22: Remaining reminders exists',
  true,
  remaining.length > 0
);
test(
  'Test 23: Remaining reminders are after current time',
  true,
  remaining.every(r => r.time > '10:00')
);

const schedule150ml = calculateReminderSchedule({
  weightKg: 52,
  wakeTime: '08:00',
  sleepTime: '20:00',
});
test(
  'Test 24: Per-reminder amount rounds to 150ml',
  150,
  schedule150ml.perReminderAmountMl
);

test(
  'Test 25: Cumulative targets increase correctly',
  true,
  schedule70kg.reminders[1].cumulativeTarget === schedule70kg.perReminderAmountMl * 2
);

const check6 = shouldSendReminder('01:00', '22:00', '06:00', null, 500, 2100);
test(
  'Test 26: Overnight schedule - within window at 01:00',
  true,
  check6.shouldSend
);

const check7 = shouldSendReminder('10:00', '22:00', '06:00', null, 500, 2100);
test(
  'Test 27: Overnight schedule - outside window at 10:00',
  false,
  check7.shouldSend
);

console.log('\n=== Test Results ===\n');
let passed = 0;
let failed = 0;

results.forEach(result => {
  if (result.passed) {
    console.log(`✓ ${result.name}`);
    passed++;
  } else {
    console.log(`✗ ${result.name}`);
    console.log(`  Expected: ${JSON.stringify(result.expected)}`);
    console.log(`  Actual: ${JSON.stringify(result.actual)}`);
    failed++;
  }
});

console.log(`\n${passed} passed, ${failed} failed out of ${results.length} tests`);

if (failed === 0) {
  console.log('\n✓ All tests passed!');
}

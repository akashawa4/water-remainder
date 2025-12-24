# Water Reminder Scheduler Logic

## Overview

This document describes the alarm-type water reminder logic that calculates personalized hydration schedules based on user weight and active hours.

## Core Algorithm

### 1. Daily Water Target Calculation

```
dailyTarget = weightKg × 35 ml
Constraints: 1800 ml ≤ dailyTarget ≤ 6000 ml
```

**Examples:**
- 55 kg person: 1925 ml
- 70 kg person: 2450 ml
- 95 kg person: 3325 ml
- 45 kg person: 1800 ml (min enforced)
- 180 kg person: 6000 ml (max enforced)

### 2. Active Hydration Window

The active window is the time between wake-up and sleep.

```
activeMinutes = sleepTime - wakeTime

// Handle overnight schedules
if (activeMinutes < 0) {
  activeMinutes += 24 × 60
}
```

**Examples:**
- Wake: 07:00, Sleep: 23:00 → 960 minutes (16 hours)
- Wake: 22:00, Sleep: 14:00 → 960 minutes (16 hours, overnight)

### 3. Reminder Interval Based on Weight

```
if weightKg ≤ 60:
  interval = 60 minutes

else if 61 ≤ weightKg ≤ 80:
  interval = 45 minutes

else if weightKg ≥ 81:
  // Adaptive: 40 minutes at 81kg, gradually reducing to 30 minutes at 111kg+
  normalized = min((weightKg - 81) / 30, 1)
  interval = round(40 - normalized × 10)
```

**Examples:**
- 55 kg → 60 min
- 70 kg → 45 min
- 85 kg → 38 min
- 95 kg → 35 min
- 110 kg → 30 min

### 4. Number of Reminders

```
numberOfReminders = floor(activeMinutes / reminderIntervalMinutes)
```

**Examples:**
- 960 min / 60 min = 16 reminders
- 960 min / 45 min = 21 reminders
- 990 min / 30 min = 33 reminders

### 5. Per-Reminder Water Amount

```
rawAmount = dailyTarget / numberOfReminders
roundedAmount = round to nearest standard size (150, 200, or 250 ml)

Rounding logic:
  ≤ 175 ml → 150 ml
  176-225 ml → 200 ml
  > 225 ml → 250 ml
```

**Examples:**
- 1925 ml / 16 = 120 ml → rounds to 150 ml
- 2450 ml / 21 = 116 ml → rounds to 150 ml
- 3325 ml / 33 = 100 ml → rounds to 150 ml

### 6. Reminder Schedule Generation

```
For each reminder i from 0 to numberOfReminders-1:
  reminderTime = wakeTime + (i × intervalMinutes)
  cumulativeTarget = (i + 1) × perReminderAmount
```

## Reminder Execution Rules

### Rule 1: Recent Intake Check

**Do not send reminder if user drank water in the last 30 minutes.**

```
timeSinceLastIntake = currentTime - lastIntakeTimestamp
if timeSinceLastIntake < 30 minutes:
  return shouldSend = false, reason = 'recent_intake'
```

This prevents reminder spam and respects natural drinking patterns.

### Rule 2: Target Reached

**Cancel all remaining reminders once daily target is reached.**

```
if currentIntakeMl ≥ dailyTargetMl:
  return shouldSend = false, reason = 'target_reached'
```

### Rule 3: Active Window

**Only send reminders during the active hydration window.**

```
if currentTime < wakeTime OR currentTime ≥ sleepTime:
  return shouldSend = false, reason = 'outside_window'
```

Handles both standard and overnight schedules correctly.

## Safety Warnings

Safety checks run before logging new water intake but **do not block** the action.

### Warning 1: Rapid Intake

```
if (recentHourIntake + newIntake) > 1500 ml:
  warn: "Consuming Xml in 1 hour exceeds safe rapid intake limit (1500ml/hour)"
```

**Rationale:** Drinking more than 1500ml per hour can lead to water intoxication (hyponatremia).

### Warning 2: Excessive Daily Intake

```
if (currentDailyIntake + newIntake) > (dailyTarget × 1.3):
  warn: "Total intake exceeds 130% of daily target"
```

**Rationale:** Exceeding target by 30%+ may cause electrolyte imbalance.

### Warning 3: Extreme Daily Intake

```
if (currentDailyIntake + newIntake) > 6000 ml:
  warn: "Intake exceeds safe daily maximum (6000ml)"
```

**Rationale:** Consuming more than 6L daily requires medical supervision.

## API Functions

### `calculateReminderSchedule(input)`

**Input:**
```typescript
{
  weightKg: number,
  wakeTime: string,  // HH:MM format
  sleepTime: string   // HH:MM format
}
```

**Output:**
```typescript
{
  dailyTargetMl: number,
  activeMinutes: number,
  reminderIntervalMinutes: number,
  numberOfReminders: number,
  perReminderAmountMl: number,
  reminders: [
    {
      time: string,           // HH:MM
      amountMl: number,
      cumulativeTarget: number
    }
  ]
}
```

### `shouldSendReminder(currentTime, wakeTime, sleepTime, lastIntakeTimestamp, currentIntakeMl, dailyTargetMl)`

**Returns:**
```typescript
{
  shouldSend: boolean,
  reason?: 'recent_intake' | 'target_reached' | 'outside_window',
  nextReminderTime?: string  // HH:MM
}
```

### `getNextScheduledReminder(schedule, currentTime, currentIntakeMl)`

**Returns:** The next reminder that:
- Is scheduled after current time
- Has cumulative target above current intake
- Returns `null` if no reminders remaining or target reached

### `checkSafetyWarnings(currentIntakeMl, newIntakeMl, dailyTargetMl, recentIntakeHistory)`

**Returns:**
```typescript
{
  hasWarning: boolean,
  warnings: string[]
}
```

### `getRemainingReminders(schedule, currentTime, currentIntakeMl)`

**Returns:** Array of all remaining reminders that haven't been fulfilled yet.

## Implementation Examples

### Example 1: 70kg Person, Normal Schedule

```
Input:
  weightKg: 70
  wakeTime: 06:30
  sleepTime: 22:30

Calculation:
  dailyTarget = 70 × 35 = 2450 ml
  activeMinutes = 960 (16 hours)
  interval = 45 minutes (61-80kg range)
  numberOfReminders = 960 / 45 = 21
  perReminder = 2450 / 21 = 116 ml → rounds to 150 ml

Schedule:
  06:30 - 150ml (cumulative: 150ml)
  07:15 - 150ml (cumulative: 300ml)
  08:00 - 150ml (cumulative: 450ml)
  ...
  22:00 - 150ml (cumulative: 3150ml)
```

### Example 2: 95kg Person, Early Schedule

```
Input:
  weightKg: 95
  wakeTime: 05:30
  sleepTime: 22:00

Calculation:
  dailyTarget = 95 × 35 = 3325 ml
  activeMinutes = 990 (16.5 hours)
  interval = 35 minutes (adaptive for 95kg)
  numberOfReminders = 990 / 35 = 28
  perReminder = 3325 / 28 = 118 ml → rounds to 150 ml

Schedule:
  05:30 - 150ml (cumulative: 150ml)
  06:05 - 150ml (cumulative: 300ml)
  06:40 - 150ml (cumulative: 450ml)
  ...
```

### Example 3: Night Shift Worker

```
Input:
  weightKg: 75
  wakeTime: 22:00
  sleepTime: 14:00

Calculation:
  dailyTarget = 75 × 35 = 2625 ml
  activeMinutes = 960 (spans midnight)
  interval = 45 minutes
  numberOfReminders = 21
  perReminder = 150 ml

Schedule:
  22:00 - 150ml
  22:45 - 150ml
  23:30 - 150ml
  00:15 - 150ml (next day)
  01:00 - 150ml
  ...
  13:30 - 150ml
```

## Edge Cases Handled

1. **Overnight schedules**: When sleep time < wake time (crosses midnight)
2. **Same wake/sleep time**: Treated as 24-hour period
3. **Weight extremes**: Min 1800ml, max 6000ml enforced
4. **Rounding precision**: Ensures practical bottle sizes (150/200/250ml)
5. **Target exceeded**: User can drink more than target, warnings issued but not blocked
6. **Recent intake suppression**: Prevents annoying duplicate reminders

## Integration Notes

This logic module is:
- **Pure functions**: No side effects, fully testable
- **Time-zone agnostic**: Works with local time strings
- **Framework independent**: Can be used with any UI or backend
- **Database ready**: Can be stored and retrieved from persistence layer

To integrate:
1. Store user profile (weight, wake/sleep times) in database
2. Calculate schedule on profile update
3. Store schedule or calculate on-demand
4. Use `shouldSendReminder()` before sending notifications
5. Check safety warnings on every water log
6. Update progress and remaining reminders in real-time

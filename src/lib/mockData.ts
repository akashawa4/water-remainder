export const mockProfile = {
  daily_target: 2500,
  weight: 70,
  activity_level: 'moderate',
};

export const mockIntakeEntries = [
  {
    id: '1',
    amount: 250,
    timestamp: new Date(new Date().setHours(8, 30, 0, 0)),
  },
  {
    id: '2',
    amount: 250,
    timestamp: new Date(new Date().setHours(10, 30, 0, 0)),
  },
  {
    id: '3',
    amount: 500,
    timestamp: new Date(new Date().setHours(12, 0, 0, 0)),
  },
];

export function getTodayIntakeMock(): number {
  return mockIntakeEntries.reduce((sum, entry) => sum + entry.amount, 0);
}

export function getNextReminderMock(): string {
  const now = new Date();
  const nextHour = new Date(now.getHours() + 1, now.getMinutes(), 0, 0);
  return nextHour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

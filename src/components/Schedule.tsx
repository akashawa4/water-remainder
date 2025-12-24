import { useEffect, useState } from 'react';
import { calculateReminderSchedule, getRemainingReminders } from '../services/reminderScheduler';
import { getUserProfile } from '../hydrationRepo';

export default function Schedule() {
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const profile = await getUserProfile();
        if (profile && profile.weight && profile.wakeTime && profile.sleepTime) {
          const reminderSchedule = calculateReminderSchedule({
            weightKg: profile.weight,
            wakeTime: profile.wakeTime,
            sleepTime: profile.sleepTime,
          });
          setSchedule(reminderSchedule);
        }
      } catch (err) {
        console.error('Failed to load schedule:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <p style={{ color: '#666' }}>Loading schedule...</p>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <p style={{ color: '#666' }}>Please complete your profile first</p>
      </div>
    );
  }

  const currentTimeStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: '#333', marginBottom: '8px' }}>Your Reminder Schedule</h2>
      <p style={{ color: '#666', marginBottom: '24px', fontSize: '14px' }}>
        Daily target: {schedule.dailyTargetMl} ml | Reminders: {schedule.numberOfReminders} per day | Amount per reminder: {schedule.perReminderAmountMl} ml
      </p>

      <div style={{ overflow: 'auto', maxHeight: '600px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Time</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Amount (ml)</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Cumulative (ml)</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {schedule.reminders.map((reminder: any, index: number) => {
              const isPast = reminder.time < currentTimeStr;
              const isUpcoming = reminder.time >= currentTimeStr;

              return (
                <tr
                  key={index}
                  style={{
                    borderBottom: '1px solid #eee',
                    backgroundColor: isPast ? '#f9fafb' : 'white',
                  }}
                >
                  <td style={{ padding: '12px', color: '#333' }}>
                    <span
                      style={{
                        fontWeight: isUpcoming ? '600' : '400',
                        color: isUpcoming ? '#10b981' : '#999',
                      }}
                    >
                      {reminder.time}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#666' }}>{reminder.amountMl} ml</td>
                  <td style={{ padding: '12px', color: '#666' }}>{reminder.cumulativeTarget} ml</td>
                  <td style={{ padding: '12px' }}>
                    {isPast ? (
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>Past</span>
                    ) : (
                      <span style={{ color: '#10b981', fontSize: '12px', fontWeight: '600' }}>
                        Upcoming
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

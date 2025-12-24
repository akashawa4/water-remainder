import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getUserProfile,
  getTodayIntake,
  saveWaterIntakeEntry,
  getWaterIntakeEntries,
} from '../hydrationRepo';
import { calculateReminderSchedule, getNextScheduledReminder } from '../services/reminderScheduler';
import {
  requestNotificationPermission,
  initializeAudio,
  showWaterReminder,
  registerServiceWorker,
  testNotification,
  syncScheduleWithServiceWorker,
  updateServiceWorkerIntake,
  subscribeToPushNotifications,
  scheduleRemindersOnServer,
  updateIntakeOnServer,
  setupServiceWorkerListener,
} from '../services/notificationService';

interface HomeProps {
  onNavigateToLog?: () => void;
  onNavigateToSchedule?: () => void;
}

// Generate a unique user ID for this browser
const getUserId = (): string => {
  let id = localStorage.getItem('water-reminder-user-id');
  if (!id) {
    id = 'user-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('water-reminder-user-id', id);
  }
  return id;
};

export default function Home({ onNavigateToLog, onNavigateToSchedule }: HomeProps) {
  const [todayIntake, setTodayIntake] = useState(0);
  const [dailyTarget, setDailyTarget] = useState(2500);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nextReminder, setNextReminder] = useState<any>(null);
  const [schedule, setSchedule] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const reminderCheckInterval = useRef<number | null>(null);
  const triggeredReminders = useRef<Set<string>>(new Set());

  // Check for upcoming reminders and show notification
  const checkReminders = useCallback(async () => {
    if (!schedule || !notificationsEnabled) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Find if any reminder matches current time and hasn't been triggered yet
    const matchingReminder = schedule.reminders.find((r: any) => r.time === currentTime);

    if (matchingReminder && todayIntake < dailyTarget && !triggeredReminders.current.has(currentTime)) {
      // Mark this reminder as triggered
      triggeredReminders.current.add(currentTime);

      await showWaterReminder(
        '💧 Water Reminder',
        `Time to drink ${matchingReminder.amountMl}ml of water!`,
        {
          amountMl: matchingReminder.amountMl,
          currentIntake: todayIntake,
          targetIntake: dailyTarget,
          onNotificationClick: () => {
            // Navigate to log water page when notification is clicked
            if (onNavigateToLog) {
              onNavigateToLog();
            }
          },
        }
      );
    }

    // Clear old triggered reminders (from previous minutes)
    triggeredReminders.current.forEach((time) => {
      if (time !== currentTime) {
        triggeredReminders.current.delete(time);
      }
    });
  }, [schedule, notificationsEnabled, todayIntake, dailyTarget, onNavigateToLog]);

  // NOTE: Local reminder checking is disabled - backend server handles push notifications
  // This prevents duplicate notifications
  // The checkReminders function and interval are kept but not used

  // Initialize reminder checking - DISABLED, using backend push notifications instead
  // useEffect(() => {
  //   if (notificationsEnabled && schedule) {
  //     reminderCheckInterval.current = window.setInterval(checkReminders, 1000);
  //     checkReminders();
  //   }
  //   return () => {
  //     if (reminderCheckInterval.current) {
  //       clearInterval(reminderCheckInterval.current);
  //     }
  //   };
  // }, [notificationsEnabled, schedule, checkReminders]);

  // Enable notifications handler
  const handleEnableNotifications = async () => {
    const userId = getUserId();

    // Initialize audio (requires user interaction)
    initializeAudio();

    // Request notification permission
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);

    // Register service worker for background notifications
    await registerServiceWorker();

    if (granted) {
      // Subscribe to push notifications via backend
      const subscribed = await subscribeToPushNotifications(userId);
      console.log('[Home] Push subscription result:', subscribed);

      // Sync schedule with service worker (fallback)
      if (schedule) {
        await syncScheduleWithServiceWorker(
          schedule.reminders,
          todayIntake,
          dailyTarget
        );

        // Also schedule on backend server for reliable push
        await scheduleRemindersOnServer(
          userId,
          schedule.reminders,
          todayIntake,
          dailyTarget
        );
      }

      // Show test notification
      await testNotification();
    }
  };

  // Setup service worker listener for navigation
  useEffect(() => {
    setupServiceWorkerListener((path) => {
      console.log('[Home] SW requested navigation to:', path);
      if (path.includes('logwater') && onNavigateToLog) {
        onNavigateToLog();
      }
    });
  }, [onNavigateToLog]);

  // Sync schedule with backend ONLY when schedule changes (not on every intake update)
  // This is tracked with a ref to prevent duplicate scheduling
  const scheduleId = useRef<string>('');

  useEffect(() => {
    if (notificationsEnabled && schedule) {
      // Create a unique ID for the schedule based on its content
      const newScheduleId = JSON.stringify(schedule.reminders.map((r: any) => r.time));

      // Only sync if schedule actually changed
      if (scheduleId.current !== newScheduleId) {
        scheduleId.current = newScheduleId;

        const userId = getUserId();
        console.log('[Home] Schedule changed, syncing with backend');

        // Local sync
        syncScheduleWithServiceWorker(
          schedule.reminders,
          todayIntake,
          dailyTarget
        );

        // Backend sync for reliable push
        scheduleRemindersOnServer(
          userId,
          schedule.reminders,
          todayIntake,
          dailyTarget
        );
      }
    }
  }, [notificationsEnabled, schedule, todayIntake, dailyTarget]);

  // Update service worker and backend when intake changes
  useEffect(() => {
    if (notificationsEnabled) {
      const userId = getUserId();
      updateServiceWorkerIntake(todayIntake);
      updateIntakeOnServer(userId, todayIntake);
    }
  }, [todayIntake, notificationsEnabled]);

  useEffect(() => {
    initializeUser();
    // Check if notifications are already enabled and register SW
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
      registerServiceWorker();
    }
  }, []);

  const initializeUser = async () => {
    try {
      const profile = await getUserProfile();

      if (!profile) {
        setError('Profile not found. Please complete setup.');
        setLoading(false);
        return;
      }

      setDailyTarget(profile.dailyTargetMl || 2500);

      const intake = await getTodayIntake();
      setTodayIntake(intake);

      const allEntries = await getWaterIntakeEntries();
      setEntries(allEntries);

      if (profile.weight && profile.wakeTime && profile.sleepTime) {
        const reminderSchedule = calculateReminderSchedule({
          weightKg: profile.weight,
          wakeTime: profile.wakeTime,
          sleepTime: profile.sleepTime,
        });
        setSchedule(reminderSchedule);

        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const next = getNextScheduledReminder(reminderSchedule, currentTime, intake);
        setNextReminder(next);
      }
    } catch (err) {
      console.error('Failed to initialize user:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize app');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWater = async (amount: number) => {
    setAdding(true);
    try {
      await saveWaterIntakeEntry({
        id: crypto.randomUUID(),
        amountMl: amount,
        source: 'manual',
        timestamp: Date.now(),
      });

      const intake = await getTodayIntake();
      setTodayIntake(intake);

      const allEntries = await getWaterIntakeEntries();
      setEntries(allEntries);

      if (schedule) {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const next = getNextScheduledReminder(schedule, currentTime, intake);
        setNextReminder(next);
      }
    } catch (err) {
      console.error('Failed to add water:', err);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ padding: '24px', backgroundColor: '#fee', borderRadius: '12px', border: '2px solid #c33' }}>
          <h2 style={{ color: '#c33', marginTop: 0 }}>Error</h2>
          <p style={{ color: '#333' }}>{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              initializeUser();
            }}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '16px',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const percentage = Math.min(100, (todayIntake / dailyTarget) * 100);
  const remaining = Math.max(0, dailyTarget - todayIntake);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#1976D2', marginBottom: '30px' }}>Hydration Tracker</h1>

      <div style={{ marginBottom: '30px', padding: '24px', backgroundColor: '#f5f5f5', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, color: '#333' }}>Today's Progress</h2>
        <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '16px 0', color: '#1976D2' }}>
          {todayIntake} / {dailyTarget} ml
        </p>
        <div style={{ width: '100%', height: '32px', backgroundColor: '#e0e0e0', borderRadius: '16px', overflow: 'hidden', marginBottom: '12px' }}>
          <div
            style={{
              height: '100%',
              width: `${percentage}%`,
              backgroundColor: percentage >= 100 ? '#4CAF50' : '#2196F3',
              transition: 'width 0.3s ease, background-color 0.3s ease',
            }}
          />
        </div>
        <p style={{ color: '#666', fontSize: '16px' }}>
          {remaining > 0 ? `${remaining} ml remaining` : 'Goal achieved!'}
        </p>
      </div>

      {schedule && (
        <div style={{ marginBottom: '30px', padding: '24px', backgroundColor: '#f0f9ff', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
          <h3 style={{ marginTop: 0, color: '#0c4a6e' }}>Reminder Schedule</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>Daily Target</p>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#0284c7' }}>{schedule.dailyTargetMl} ml</p>
            </div>
            <div>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>Reminders per day</p>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#0284c7' }}>{schedule.numberOfReminders}x</p>
            </div>
            <div>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>Per reminder</p>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#0284c7' }}>{schedule.perReminderAmountMl} ml</p>
            </div>
            <div>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>Interval</p>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#0284c7' }}>{schedule.reminderIntervalMinutes} min</p>
            </div>
          </div>
          {nextReminder && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'white', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: '600' }}>Next Reminder</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
                {nextReminder.time} - {nextReminder.amountMl} ml
              </p>
            </div>
          )}

          {/* Audio Notification Section */}
          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: notificationsEnabled ? '#d1fae5' : '#fef3c7',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div>
              <p style={{
                margin: '0 0 4px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: notificationsEnabled ? '#065f46' : '#92400e'
              }}>
                🔔 Audio Reminders {notificationsEnabled ? 'Enabled' : 'Disabled'}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                {notificationsEnabled
                  ? 'You will receive audio notifications at scheduled times'
                  : 'Enable to get audio alerts for water reminders'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!notificationsEnabled && (
                <button
                  onClick={handleEnableNotifications}
                  style={{
                    padding: '10px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#d97706')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#f59e0b')}
                >
                  Enable Notifications
                </button>
              )}
              {notificationsEnabled && (
                <button
                  onClick={() => testNotification()}
                  style={{
                    padding: '10px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
                >
                  🔊 Test Notification
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '16px' }}>Quick Add</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
          {[250, 500, 750, 1000].map((amount) => (
            <button
              key={amount}
              onClick={() => handleAddWater(amount)}
              disabled={adding}
              style={{
                padding: '16px',
                fontSize: '18px',
                fontWeight: 'bold',
                backgroundColor: adding ? '#ccc' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: adding ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              {amount}ml
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px', backgroundColor: '#e3f2fd', borderRadius: '12px' }}>
        <h3 style={{ marginTop: 0 }}>Recent Entries</h3>
        {entries.length === 0 ? (
          <p style={{ color: '#666' }}>No entries yet today. Start tracking your water intake!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {entries.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 'bold', color: '#1976D2' }}>{entry.amountMl}ml</span>
                <span style={{ color: '#666', fontSize: '14px' }}>
                  {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

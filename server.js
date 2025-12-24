import express from 'express';
import webpush from 'web-push';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Generate VAPID keys for web push
const generatedKeys = webpush.generateVAPIDKeys();
console.log('Generated VAPID Keys:');
console.log('Public Key:', generatedKeys.publicKey);
console.log('Private Key:', generatedKeys.privateKey);

webpush.setVapidDetails(
    'mailto:water-reminder@example.com',
    generatedKeys.publicKey,
    generatedKeys.privateKey
);

// Store subscriptions in memory (use database in production)
const subscriptions = new Map();

// Store scheduled reminders
const scheduledReminders = new Map();
const activeTimeouts = new Map();

// Track sent reminders to prevent duplicates (key: `${userId}-${time}`)
const sentReminders = new Map();

// Clear sent reminders at midnight
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        sentReminders.clear();
        console.log('[Server] Cleared sent reminders for new day');
    }
}, 60000);

// Endpoint to get VAPID public key
app.get('/api/vapid-public-key', (req, res) => {
    res.json({ publicKey: generatedKeys.publicKey });
});

// Endpoint to subscribe to push notifications
app.post('/api/subscribe', (req, res) => {
    const { subscription, userId } = req.body;

    if (!subscription || !userId) {
        return res.status(400).json({ error: 'Missing subscription or userId' });
    }

    subscriptions.set(userId, subscription);
    console.log(`[Server] User ${userId} subscribed to push notifications`);

    res.json({ success: true });
});

// Endpoint to unsubscribe
app.post('/api/unsubscribe', (req, res) => {
    const { userId } = req.body;
    subscriptions.delete(userId);

    // Clear any active timeouts
    const userTimeouts = activeTimeouts.get(userId) || [];
    userTimeouts.forEach(timeout => clearTimeout(timeout));
    activeTimeouts.delete(userId);

    console.log(`[Server] User ${userId} unsubscribed`);
    res.json({ success: true });
});

// Endpoint to schedule reminders
app.post('/api/schedule-reminders', (req, res) => {
    const { userId, reminders, currentIntake, targetIntake } = req.body;

    if (!userId || !reminders) {
        return res.status(400).json({ error: 'Missing userId or reminders' });
    }

    // Clear existing timeouts for this user
    const existingTimeouts = activeTimeouts.get(userId) || [];
    existingTimeouts.forEach(timeout => clearTimeout(timeout));
    activeTimeouts.delete(userId);

    // Store the schedule
    scheduledReminders.set(userId, {
        reminders,
        currentIntake: currentIntake || 0,
        targetIntake: targetIntake || 2500
    });

    // Schedule notifications for each reminder
    const newTimeouts = [];
    const now = new Date();

    reminders.forEach(reminder => {
        const [hours, minutes] = reminder.time.split(':').map(Number);
        const reminderTime = new Date(now);
        reminderTime.setHours(hours, minutes, 0, 0);

        // If time has passed today, skip
        if (reminderTime <= now) {
            return;
        }

        const delay = reminderTime.getTime() - now.getTime();

        const timeout = setTimeout(async () => {
            const reminderKey = `${userId}-${reminder.time}`;

            // Check if this reminder was already sent today
            if (sentReminders.has(reminderKey)) {
                console.log(`[Server] Skipping duplicate reminder for ${userId} at ${reminder.time}`);
                return;
            }

            const subscription = subscriptions.get(userId);
            const schedule = scheduledReminders.get(userId);

            if (subscription && schedule && schedule.currentIntake < schedule.targetIntake) {
                try {
                    // Mark as sent BEFORE sending to prevent race conditions
                    sentReminders.set(reminderKey, Date.now());

                    const payload = JSON.stringify({
                        title: '💧 Time to Drink Water!',
                        body: `Drink ${reminder.amountMl}ml of water! Progress: ${schedule.currentIntake}/${schedule.targetIntake}ml`,
                        icon: '/water-drop.png',
                        badge: '/water-drop.png',
                        tag: 'water-reminder-' + reminder.time,
                        data: {
                            time: reminder.time,
                            amountMl: reminder.amountMl,
                            navigateTo: '/logwater'
                        }
                    });

                    await webpush.sendNotification(subscription, payload);
                    console.log(`[Server] Push notification sent to ${userId} for ${reminder.time}`);
                } catch (error) {
                    console.error(`[Server] Error sending notification:`, error.message);
                    if (error.statusCode === 410) {
                        subscriptions.delete(userId);
                    }
                }
            }
        }, delay);

        newTimeouts.push(timeout);
        console.log(`[Server] Scheduled notification for ${userId} at ${reminder.time} (in ${Math.round(delay / 1000)}s)`);
    });

    activeTimeouts.set(userId, newTimeouts);

    res.json({
        success: true,
        scheduledCount: newTimeouts.length,
        message: `Scheduled ${newTimeouts.length} reminders for today`
    });
});

// Endpoint to update intake
app.post('/api/update-intake', (req, res) => {
    const { userId, currentIntake } = req.body;

    const schedule = scheduledReminders.get(userId);
    if (schedule) {
        schedule.currentIntake = currentIntake;
        scheduledReminders.set(userId, schedule);
        console.log(`[Server] Updated intake for ${userId}: ${currentIntake}ml`);
    }

    res.json({ success: true });
});

// Endpoint to send a test notification
app.post('/api/test-notification', async (req, res) => {
    const { userId } = req.body;
    const subscription = subscriptions.get(userId);

    if (!subscription) {
        return res.status(404).json({ error: 'User not subscribed' });
    }

    try {
        const payload = JSON.stringify({
            title: '💧 Test Notification',
            body: 'Push notifications are working! You will receive water reminders.',
            icon: '/water-drop.png',
            badge: '/water-drop.png',
            tag: 'water-reminder-test'
        });

        await webpush.sendNotification(subscription, payload);
        console.log(`[Server] Test notification sent to ${userId}`);
        res.json({ success: true });
    } catch (error) {
        console.error('[Server] Error sending test notification:', error.message);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        subscriptions: subscriptions.size,
        activeSchedules: scheduledReminders.size
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`[Server] Push notification server running on http://localhost:${PORT}`);
    console.log(`[Server] VAPID Public Key: ${generatedKeys.publicKey}`);
});

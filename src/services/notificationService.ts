/**
 * Notification Service with Audio Reminders
 * Handles browser notifications and audio alerts for water reminders
 */

// Audio context for generating notification sounds
let audioContext: AudioContext | null = null;

// Reminder check interval ID
let reminderIntervalId: number | null = null;

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission === 'denied') {
        console.warn('Notification permission was denied');
        return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
}

/**
 * Initialize the audio context (must be called after user interaction)
 */
export function initializeAudio(): void {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
}

/**
 * Play a pleasant water drop notification sound
 */
export function playNotificationSound(): void {
    if (!audioContext) {
        initializeAudio();
    }

    if (!audioContext) return;

    // Resume audio context if suspended (required by browsers)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    const now = audioContext.currentTime;

    // Create a pleasant multi-tone chime sound
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 - a pleasant major chord

    frequencies.forEach((freq, index) => {
        const oscillator = audioContext!.createOscillator();
        const gainNode = audioContext!.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext!.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, now);

        // Stagger the notes slightly for a chime effect
        const startTime = now + index * 0.1;
        const duration = 0.5;

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    });

    // Add a second chime after a short pause
    setTimeout(() => {
        if (!audioContext) return;

        const now2 = audioContext.currentTime;
        frequencies.forEach((freq, index) => {
            const oscillator = audioContext!.createOscillator();
            const gainNode = audioContext!.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext!.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, now2);

            const startTime = now2 + index * 0.1;
            const duration = 0.5;

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        });
    }, 600);
}

/**
 * Show a browser notification with audio
 */
export async function showWaterReminder(
    title: string = '💧 Time to Drink Water!',
    body: string = 'Stay hydrated! Take a moment to drink some water.',
    options?: {
        amountMl?: number;
        currentIntake?: number;
        targetIntake?: number;
        onNotificationClick?: () => void;
    }
): Promise<void> {
    console.log('[Notification] Showing water reminder:', { title, options });

    // Play the notification sound
    playNotificationSound();

    // Build notification body
    let notificationBody = body;
    if (options?.amountMl) {
        notificationBody = `Drink ${options.amountMl}ml of water to stay on track!`;
    }
    if (options?.currentIntake !== undefined && options?.targetIntake) {
        notificationBody += ` Progress: ${options.currentIntake}/${options.targetIntake}ml`;
    }

    // Check if Notification API is available
    if (!('Notification' in window)) {
        console.error('[Notification] Browser does not support notifications');
        alert(`${title}\n\n${notificationBody}`);
        return;
    }

    console.log('[Notification] Current permission:', Notification.permission);

    // Show browser notification
    const hasPermission = await requestNotificationPermission();
    console.log('[Notification] Permission granted:', hasPermission);

    if (hasPermission) {
        try {
            const notification = new Notification(title, {
                body: notificationBody,
                icon: '/water-drop.png',
                badge: '/water-drop.png',
                tag: 'water-reminder-' + Date.now(), // Unique tag to allow multiple notifications
                requireInteraction: false, // Don't require interaction to dismiss
            });

            console.log('[Notification] Notification created successfully');

            // Auto-close after 15 seconds
            setTimeout(() => notification.close(), 15000);

            notification.onclick = () => {
                console.log('[Notification] Notification clicked');
                window.focus();
                notification.close();
                // Call the callback if provided
                if (options?.onNotificationClick) {
                    options.onNotificationClick();
                }
            };

            notification.onerror = (e) => {
                console.error('[Notification] Error showing notification:', e);
            };

            notification.onshow = () => {
                console.log('[Notification] Notification shown');
            };
        } catch (error) {
            console.error('[Notification] Failed to create notification:', error);
            // Fallback to alert
            alert(`${title}\n\n${notificationBody}`);
        }
    } else {
        console.warn('[Notification] Permission not granted, using alert');
        alert(`${title}\n\n${notificationBody}`);
    }
}

/**
 * Register the service worker for background notifications
 */
export async function registerServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service workers are not supported');
        return false;
    }

    try {
        await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
        return true;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        return false;
    }
}

/**
 * Schedule a reminder at a specific time
 */
export function scheduleReminder(
    time: string,
    options: {
        title?: string;
        body?: string;
        amountMl?: number;
        currentIntake?: number;
        targetIntake?: number;
    } = {}
): void {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const reminderTime = new Date(now);
    reminderTime.setHours(hours, minutes, 0, 0);

    // If the time is in the past, schedule for tomorrow
    if (reminderTime <= now) {
        reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const delay = reminderTime.getTime() - now.getTime();

    setTimeout(() => {
        showWaterReminder(
            options.title || '💧 Time to Drink Water!',
            options.body || 'Stay hydrated! Take a moment to drink some water.',
            {
                amountMl: options.amountMl,
                currentIntake: options.currentIntake,
                targetIntake: options.targetIntake,
            }
        );
    }, delay);
}

/**
 * Start continuous reminder checking
 */
export function startReminderService(
    getReminderSchedule: () => { time: string; amountMl: number }[] | null,
    getCurrentIntake: () => number,
    getDailyTarget: () => number
): void {
    if (reminderIntervalId !== null) {
        clearInterval(reminderIntervalId);
    }

    // Check every minute
    reminderIntervalId = window.setInterval(() => {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const schedule = getReminderSchedule();
        if (!schedule) return;

        const currentIntake = getCurrentIntake();
        const dailyTarget = getDailyTarget();

        // Check if it's time for any reminder
        const matchingReminder = schedule.find(r => r.time === currentTime);
        if (matchingReminder) {
            showWaterReminder(
                '💧 Water Reminder',
                `Time to drink ${matchingReminder.amountMl}ml of water!`,
                {
                    amountMl: matchingReminder.amountMl,
                    currentIntake,
                    targetIntake: dailyTarget,
                }
            );
        }
    }, 60000); // Check every minute
}

/**
 * Stop the reminder service
 */
export function stopReminderService(): void {
    if (reminderIntervalId !== null) {
        clearInterval(reminderIntervalId);
        reminderIntervalId = null;
    }
}

/**
 * Test the notification (for user to enable notifications)
 */
export async function testNotification(): Promise<void> {
    await showWaterReminder(
        '💧 Notifications Enabled!',
        'You will now receive water reminders. Stay hydrated!',
        { amountMl: 250 }
    );
}

/**
 * Sync the reminder schedule with the service worker for background notifications
 */
export async function syncScheduleWithServiceWorker(
    reminders: { time: string; amountMl: number }[],
    currentIntake: number,
    targetIntake: number
): Promise<void> {
    if (!('serviceWorker' in navigator)) {
        console.warn('[Notification] Service workers not supported');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
            registration.active.postMessage({
                type: 'SET_SCHEDULE',
                reminders: reminders,
                currentIntake: currentIntake,
                targetIntake: targetIntake
            });
            console.log('[Notification] Schedule synced with service worker:', reminders.length, 'reminders');
        }
    } catch (error) {
        console.error('[Notification] Failed to sync schedule:', error);
    }
}

/**
 * Update the current intake in the service worker
 */
export async function updateServiceWorkerIntake(currentIntake: number): Promise<void> {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
            registration.active.postMessage({
                type: 'UPDATE_INTAKE',
                currentIntake: currentIntake
            });
        }
    } catch (error) {
        console.error('[Notification] Failed to update intake:', error);
    }
}

/**
 * Setup listener for service worker messages (for navigation and sound)
 */
export function setupServiceWorkerListener(onNavigate: (path: string) => void): void {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[Notification] Received message from SW:', event.data);
        if (event.data.type === 'NAVIGATE_TO') {
            onNavigate(event.data.path);
        }
        if (event.data.type === 'PLAY_NOTIFICATION_SOUND') {
            playNotificationSound();
        }
    });
}

// Backend server URL
const PUSH_SERVER_URL = 'http://localhost:3001';

/**
 * Subscribe to push notifications via backend server
 */
export async function subscribeToPushNotifications(userId: string): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('[Push] Push notifications not supported');
        return false;
    }

    try {
        // Get VAPID public key from server
        const response = await fetch(`${PUSH_SERVER_URL}/api/vapid-public-key`);
        const { publicKey } = await response.json();

        // Convert VAPID key to Uint8Array
        const vapidPublicKey = urlBase64ToUint8Array(publicKey);

        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;

        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidPublicKey as BufferSource
        });

        // Send subscription to server
        await fetch(`${PUSH_SERVER_URL}/api/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                userId: userId
            })
        });

        console.log('[Push] Successfully subscribed to push notifications');
        return true;
    } catch (error) {
        console.error('[Push] Failed to subscribe:', error);
        return false;
    }
}

/**
 * Schedule reminders on the backend server
 */
export async function scheduleRemindersOnServer(
    userId: string,
    reminders: { time: string; amountMl: number }[],
    currentIntake: number,
    targetIntake: number
): Promise<boolean> {
    try {
        const response = await fetch(`${PUSH_SERVER_URL}/api/schedule-reminders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                reminders,
                currentIntake,
                targetIntake
            })
        });

        const result = await response.json();
        console.log('[Push] Schedule response:', result);
        return result.success;
    } catch (error) {
        console.error('[Push] Failed to schedule reminders:', error);
        return false;
    }
}

/**
 * Update intake on backend server
 */
export async function updateIntakeOnServer(userId: string, currentIntake: number): Promise<void> {
    try {
        await fetch(`${PUSH_SERVER_URL}/api/update-intake`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, currentIntake })
        });
    } catch (error) {
        console.error('[Push] Failed to update intake:', error);
    }
}

/**
 * Send a test push notification
 */
export async function sendTestPushNotification(userId: string): Promise<boolean> {
    try {
        const response = await fetch(`${PUSH_SERVER_URL}/api/test-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });

        return response.ok;
    } catch (error) {
        console.error('[Push] Failed to send test notification:', error);
        return false;
    }
}

/**
 * Helper function to convert VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

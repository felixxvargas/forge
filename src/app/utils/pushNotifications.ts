import { Capacitor } from '@capacitor/core';

export async function initPushNotifications(userId: string) {
  if (!Capacitor.isNativePlatform()) return;

  let PushNotifications: typeof import('@capacitor/push-notifications').PushNotifications;
  try {
    ({ PushNotifications } = await import('@capacitor/push-notifications'));
  } catch {
    return;
  }

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (token) => {
    try {
      const res = await fetch('/api/push/register-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: token.value, platform: 'android' }),
      });
      if (!res.ok) {
        const err = await res.text().catch(() => res.status.toString());
        console.error('[push] register-token failed:', err);
      }
    } catch (err) {
      console.error('[push] register-token error:', err);
    }
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification.data as Record<string, string> | undefined;
    if (data?.url) window.location.href = data.url;
  });
}

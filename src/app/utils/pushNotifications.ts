import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

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
      // Use Supabase client directly — avoids CORS preflight against forge-social.app
      // and uses the user's JWT so the RLS insert policy (auth.uid() = user_id) passes.
      const { error } = await supabase
        .from('device_tokens')
        .upsert(
          { user_id: userId, token: token.value, platform: 'android' },
          { onConflict: 'user_id,platform' }
        );
      if (error) console.error('[push] device_tokens upsert failed:', error.message);
    } catch (err) {
      console.error('[push] registration error:', err);
    }
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification.data as Record<string, string> | undefined;
    if (data?.url) window.location.href = data.url;
  });
}

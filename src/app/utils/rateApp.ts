import { Capacitor } from '@capacitor/core';
import { InAppReview } from '@capacitor-community/in-app-review';

export async function requestAppReview(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  try {
    await InAppReview.requestReview();
  } catch {
    // Play Core not available (emulator, sideload) — open Play Store listing as fallback
    window.open('market://details?id=app.forge.social', '_blank');
  }
}

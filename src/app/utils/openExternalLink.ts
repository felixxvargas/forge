import { Capacitor } from '@capacitor/core';

export type LinkPreference = 'inapp' | 'browser';

const PREF_KEY = 'forge-link-preference';

export function getStoredLinkPreference(): LinkPreference | null {
  try {
    const v = localStorage.getItem(PREF_KEY);
    if (v === 'inapp' || v === 'browser') return v;
  } catch {}
  return null;
}

export function storeLinkPreference(pref: LinkPreference): void {
  try { localStorage.setItem(PREF_KEY, pref); } catch {}
}

export function clearLinkPreference(): void {
  try { localStorage.removeItem(PREF_KEY); } catch {}
}

export async function openLink(url: string, pref: LinkPreference): Promise<void> {
  if (pref === 'inapp' && Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

import { useEffect } from 'react';

interface ProfileMetaOptions {
  displayName: string;
  handle: string;
  bio?: string;
  profilePicture?: string;
}

function setMeta(selector: string, attr: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    if (attr === 'property') el.setAttribute('property', selector.match(/\[property="([^"]+)"\]/)?.[1] ?? '');
    else el.setAttribute('name', selector.match(/\[name="([^"]+)"\]/)?.[1] ?? '');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useProfileMeta({ displayName, handle, bio, profilePicture }: ProfileMetaOptions) {
  useEffect(() => {
    if (!displayName && !handle) return;

    const cleanHandle = handle.replace(/^@/, '');
    const title = `${displayName || cleanHandle} (@${cleanHandle}) · Forge`;
    const description = bio || `Check out ${displayName || cleanHandle}'s gaming profile on Forge.`;
    const imageParams = new URLSearchParams({
      name: displayName || cleanHandle,
      handle: cleanHandle,
      ...(bio && { bio }),
      ...(profilePicture && { avatar: profilePicture }),
    });
    const ogImage = `${window.location.origin}/api/og?${imageParams}`;
    const canonical = `${window.location.origin}/${cleanHandle}`;

    document.title = title;
    setMeta('[name="description"]', 'name', description);
    setMeta('[property="og:title"]', 'property', title);
    setMeta('[property="og:description"]', 'property', description);
    setMeta('[property="og:image"]', 'property', ogImage);
    setMeta('[property="og:url"]', 'property', canonical);
    setMeta('[property="og:type"]', 'property', 'profile');
    setMeta('[name="twitter:title"]', 'name', title);
    setMeta('[name="twitter:description"]', 'name', description);
    setMeta('[name="twitter:image"]', 'name', ogImage);

    return () => {
      document.title = 'Forge';
    };
  }, [displayName, handle, bio, profilePicture]);
}

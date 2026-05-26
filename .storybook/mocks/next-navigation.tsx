// Mock for next/navigation used in Storybook
// Prevents "invariant expected app router to be mounted" from components
// that import useRouter, usePathname, etc. directly from next/navigation.

const noop = () => {};

export function useRouter() {
  return {
    push: noop,
    replace: noop,
    back: noop,
    forward: noop,
    refresh: noop,
    prefetch: noop,
  };
}

export function usePathname() {
  return '/';
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function useParams() {
  return {};
}

export function useSelectedLayoutSegment() {
  return null;
}

export function useSelectedLayoutSegments() {
  return [];
}

export function notFound() {}
export function redirect(_url: string) {}
export function permanentRedirect(_url: string) {}

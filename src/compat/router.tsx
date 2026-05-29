'use client';
/**
 * React Router → Next.js compatibility shim.
 * All pages import from here instead of 'react-router' so the migration
 * is a single find-and-replace rather than a per-file rewrite.
 */
import {
  useRouter,
  usePathname,
  useParams as nextUseParams,
  useSearchParams as nextUseSearchParams,
} from 'next/navigation';
import NextLink from 'next/link';
import { useEffect, type ComponentProps, type ReactNode } from 'react';

// useNavigate — returns a function matching React Router's signature
export function useNavigate() {
  const router = useRouter();
  const pathname = usePathname();
  return (to: string | number, opts?: { replace?: boolean; state?: any }) => {
    if (typeof to === 'number') { router.back(); return; }
    // Save current path before every push so detail pages can navigate back correctly
    try { sessionStorage.setItem('forge_prev_path', pathname); } catch {}
    if (opts?.replace) router.replace(to as string);
    else router.push(to as string);
  };
}

// useLocation — returns pathname and empty search.
// Intentionally avoids useSearchParams() here to prevent the Next.js Suspense
// boundary requirement on every page. Pages that need search params should
// call useSearchParams() directly and wrap with <Suspense>.
export function useLocation() {
  const pathname = usePathname();
  return { pathname, search: '', state: null as any, hash: '', key: 'default' };
}

// useParams — Next.js returns string | string[]; cast to string for compat.
// Supports the generic useParams<T>() form used by some pages.
export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  const params = nextUseParams();
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    result[k] = Array.isArray(v) ? v[0] : v;
  }
  return result as T;
}

// useSearchParams — [params, setter] tuple matching React Router's API.
// Setter also accepts plain objects: setSearchParams({ key: 'value' })
export function useSearchParams() {
  const params = nextUseSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const setParams = (
    next: URLSearchParams | Record<string, string> | ((p: URLSearchParams) => URLSearchParams)
  ) => {
    let updated: URLSearchParams;
    if (typeof next === 'function') {
      updated = next(new URLSearchParams(params.toString()));
    } else if (next instanceof URLSearchParams) {
      updated = next;
    } else {
      // Plain object — merge into existing params
      updated = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next as Record<string, string>)) {
        if (v != null) updated.set(k, String(v));
      }
    }
    const qs = updated.toString();
    router.push(pathname + (qs ? `?${qs}` : ''));
  };
  return [params, setParams] as const;
}

// Link — accepts `to` so no JSX changes needed in existing pages
export function Link({
  to,
  children,
  ...props
}: { to: string; children?: ReactNode } & Omit<ComponentProps<typeof NextLink>, 'href'>) {
  return <NextLink href={to} {...props}>{children}</NextLink>;
}

// Navigate — declarative redirect (replaces React Router's <Navigate>)
export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (replace) router.replace(to);
    else router.push(to);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// ScrollRestoration — no-op; Next.js handles scroll automatically
export function ScrollRestoration() { return null; }

// NavLink — simplified; active styling can be added later
export function NavLink({
  to,
  children,
  ...props
}: { to: string; children?: ReactNode } & Omit<ComponentProps<typeof NextLink>, 'href'>) {
  return <NextLink href={to} {...props}>{children}</NextLink>;
}

// --- React Router error-boundary APIs (stubbed for Next.js) ---
export function useRouteError() { return null; }
export function isRouteErrorResponse(_error: unknown): boolean { return false; }

// --- Navigation type (PUSH/REPLACE/POP) — approximated ---
export function useNavigationType(): 'POP' | 'PUSH' | 'REPLACE' { return 'PUSH'; }

// --- useBlocker — stub; navigation blocking not yet supported in Next.js App Router ---
export function useBlocker(_condition: any) {
  return {
    state: 'unblocked' as 'unblocked' | 'blocked' | 'proceeding',
    proceed: () => {},
    reset: () => {},
  };
}

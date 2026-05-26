import React from 'react';

export function useNavigate() {
  return (_to: string | number, _opts?: { replace?: boolean }) => {};
}

export function useLocation() {
  return { pathname: '/', search: '', state: null, hash: '', key: 'default' };
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  return {} as T;
}

export function useSearchParams() {
  return [new URLSearchParams(), (_next: unknown) => {}] as const;
}

export function Link({ to, children, ...props }: { to: string; children?: React.ReactNode } & Record<string, unknown>) {
  return <a href={to as string} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>{children}</a>;
}

export function Navigate(_: { to: string; replace?: boolean }) { return null; }
export function ScrollRestoration() { return null; }

export function NavLink({ to, children, ...props }: { to: string; children?: React.ReactNode } & Record<string, unknown>) {
  return <a href={to as string} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>{children}</a>;
}

export function useRouteError() { return null; }
export function isRouteErrorResponse(_error: unknown): boolean { return false; }
export function useNavigationType(): 'POP' | 'PUSH' | 'REPLACE' { return 'PUSH'; }
export function useBlocker(_condition: unknown) {
  return { state: 'unblocked' as const, proceed: () => {}, reset: () => {} };
}

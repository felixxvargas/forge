export function profilePath(user: { handle?: string | null; id: string }): string {
  const h = user.handle?.replace(/^@/, '');
  return h ? `/profile/${h}` : `/profile/${user.id}`;
}

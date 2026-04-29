export const MENTOR_HANDLES = ['tulumatum'];

export function isMentorHandle(handle: string): boolean {
  return MENTOR_HANDLES.includes(handle.replace(/^@/, '').toLowerCase());
}

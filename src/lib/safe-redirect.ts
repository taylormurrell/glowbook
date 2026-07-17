// Guard for the post-auth redirect target. Only same-origin relative paths are
// allowed, so a crafted `next` param on the reset link can't be turned into an
// open redirect to an attacker's site.
export function safeRedirectPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return fallback
  }
  return next
}

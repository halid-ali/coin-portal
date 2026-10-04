/**
 * A ?returnUrl= value that is safe to navigate to after signing in: only app-internal paths, to
 * avoid open redirects ("//evil.example" is protocol-relative). Anything else gives "/".
 */
export function safeReturnUrl(url: string | null | undefined): string {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
}

/** Back to the page start after a list changes page: smooth, unless the system asks for less motion. */
export function scrollToTop(): void {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}

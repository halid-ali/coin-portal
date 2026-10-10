/**
 * The mouse wheel over a focused number field scrolls the page instead of stepping the value
 * (user choice 2026-10-10): Chromium steps it and keeps the page still, so a year changed by
 * accident while scrolling. One listener for the whole document, so every number field (and a
 * new one) behaves like a text field; ↑/↓ still step. Returns the clean-up.
 */
export function scrollPastNumberFields(doc: Document): () => void {
  const onWheel = (event: WheelEvent) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement &&
      target.type === 'number' &&
      target === doc.activeElement &&
      !event.ctrlKey // the browser's zoom
    ) {
      event.preventDefault();
      // Lines or pages from some mice: roughly what the browser would scroll
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? (doc.defaultView?.innerHeight ?? 800)
            : 1;
      doc.defaultView?.scrollBy(event.deltaX * unit, event.deltaY * unit);
    }
  };
  // Not passive: the step is only cancelled before it happens
  doc.addEventListener('wheel', onWheel, { passive: false });
  return () => doc.removeEventListener('wheel', onWheel);
}

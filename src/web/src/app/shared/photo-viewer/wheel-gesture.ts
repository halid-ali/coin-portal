/**
 * Turns mouse wheel / touchpad scrolling into single steps: one gesture moves one photo, however
 * long it goes on. A gesture ends after `gapMs` without wheel events (touchpads keep sending events
 * while the scroll coasts); scrolling the other way starts a new gesture right away.
 */
export class WheelGesture {
  private lastTime = -Infinity;
  private direction = 0;

  constructor(private readonly gapMs = 300) {}

  /** Step for this wheel event: +1 (down / right), -1 (up / left) or 0 while the gesture lasts. */
  next(event: Pick<WheelEvent, 'deltaX' | 'deltaY' | 'timeStamp'>): -1 | 0 | 1 {
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (delta === 0) {
      return 0;
    }
    const direction = delta > 0 ? 1 : -1;
    const fresh = event.timeStamp - this.lastTime > this.gapMs || direction !== this.direction;
    this.lastTime = event.timeStamp;
    this.direction = direction;
    return fresh ? direction : 0;
  }
}

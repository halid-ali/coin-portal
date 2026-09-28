import { WheelGesture } from './wheel-gesture';

describe('WheelGesture', () => {
  const wheel = (deltaY: number, timeStamp: number, deltaX = 0) => ({ deltaX, deltaY, timeStamp });

  it('steps once per gesture, however long it scrolls', () => {
    const gesture = new WheelGesture(300);
    expect(gesture.next(wheel(100, 0))).toBe(1);
    expect(gesture.next(wheel(100, 80))).toBe(0);
    expect(gesture.next(wheel(100, 200))).toBe(0);
    // Still the same gesture: each event is within the gap of the previous one
    expect(gesture.next(wheel(100, 450))).toBe(0);
  });

  it('starts a new gesture after a pause', () => {
    const gesture = new WheelGesture(300);
    expect(gesture.next(wheel(100, 0))).toBe(1);
    expect(gesture.next(wheel(100, 301))).toBe(1);
  });

  it('steps back up and at once when the direction turns', () => {
    const gesture = new WheelGesture(300);
    expect(gesture.next(wheel(-100, 0))).toBe(-1);
    expect(gesture.next(wheel(100, 50))).toBe(1);
    expect(gesture.next(wheel(100, 100))).toBe(0);
  });

  it('uses the stronger axis and ignores empty events', () => {
    const gesture = new WheelGesture(300);
    expect(gesture.next(wheel(0, 0))).toBe(0);
    expect(gesture.next(wheel(2, 10, -60))).toBe(-1);
  });
});

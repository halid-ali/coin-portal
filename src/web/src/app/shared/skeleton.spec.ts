import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { SKELETON_DELAY_MS, delayedLoading } from './skeleton';

describe('delayedLoading', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setUp() {
    const loading = signal(false);
    const shown = delayedLoading(loading);
    // Effects (toObservable) run on a tick
    const tick = () => TestBed.tick();
    return { loading, shown, tick };
  }

  it('turns on only after the load has run for the delay', () => {
    const { loading, shown, tick } = TestBed.runInInjectionContext(setUp);
    tick();
    expect(shown()).toBe(false);

    loading.set(true);
    tick();
    vi.advanceTimersByTime(SKELETON_DELAY_MS - 1);
    expect(shown()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(shown()).toBe(true);

    loading.set(false);
    tick();
    expect(shown()).toBe(false);
  });

  it('stays off for a load quicker than the delay', () => {
    const { loading, shown, tick } = TestBed.runInInjectionContext(setUp);
    loading.set(true);
    tick();
    vi.advanceTimersByTime(SKELETON_DELAY_MS / 2);
    loading.set(false);
    tick();

    vi.advanceTimersByTime(SKELETON_DELAY_MS);
    expect(shown()).toBe(false);
  });
});

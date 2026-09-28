import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

/** A matchMedia stand-in whose dark setting the test can flip. */
function fakeSystem(dark: boolean) {
  const listeners: ((e: { matches: boolean }) => void)[] = [];
  const query = {
    matches: dark,
    addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.push(fn),
  };
  window.matchMedia = (() => query) as unknown as typeof window.matchMedia;
  return {
    set(next: boolean) {
      query.matches = next;
      listeners.forEach((fn) => fn({ matches: next }));
    },
  };
}

describe('ThemeService', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.documentElement.classList.remove('dark');
  });

  function create(): ThemeService {
    TestBed.resetTestingModule();
    const theme = TestBed.inject(ThemeService);
    TestBed.tick();
    return theme;
  }

  it('follows the device until the user chooses', () => {
    const system = fakeSystem(true);
    const theme = create();

    expect(theme.preference()).toBe('System');
    expect(theme.current()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    system.set(false);
    TestBed.tick();
    expect(theme.current()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('applies and remembers a choice on this browser', () => {
    fakeSystem(false);
    const theme = create();

    theme.use('Dark');
    TestBed.tick();
    expect(theme.current()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('coinportal.theme')).toBe('Dark');

    expect(create().preference()).toBe('Dark');
  });

  it('ignores unknown stored values', () => {
    localStorage.setItem('coinportal.theme', 'Sepia');
    fakeSystem(false);
    expect(create().preference()).toBe('System');
  });
});

import { TestBed } from '@angular/core/testing';

import { AccentService } from './accent.service';

describe('AccentService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => document.documentElement.removeAttribute('data-accent'));

  function create(): AccentService {
    TestBed.resetTestingModule();
    const accent = TestBed.inject(AccentService);
    TestBed.tick();
    return accent;
  }

  it('uses amber without an attribute until the user chooses', () => {
    const accent = create();

    expect(accent.current()).toBe('Amber');
    expect(document.documentElement.hasAttribute('data-accent')).toBe(false);
  });

  it('shows the chosen color and remembers it on this browser', () => {
    create().use('Teal');
    TestBed.tick();
    expect(document.documentElement.getAttribute('data-accent')).toBe('Teal');

    const next = create();
    expect(next.current()).toBe('Teal');
  });

  it('removes the attribute when switching back to amber', () => {
    const accent = create();
    accent.use('Rose');
    TestBed.tick();
    accent.use('Amber');
    TestBed.tick();

    expect(document.documentElement.hasAttribute('data-accent')).toBe(false);
  });

  it('ignores an unknown saved value', () => {
    localStorage.setItem('coinportal.accent', 'Purple');

    expect(create().current()).toBe('Amber');
  });
});

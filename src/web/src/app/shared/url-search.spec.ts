import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { SEARCH_MAX_LENGTH, normalizeSearch, syncSearchWithUrl } from './url-search';

/** The URL is a signal here; apply() writes it back, as router.navigate would. */
@Component({ template: '' })
class Host {
  readonly url = signal<string | undefined>(undefined);
  readonly control = new FormControl('', { nonNullable: true });
  readonly applied: (string | null)[] = [];

  constructor() {
    syncSearchWithUrl(this.control, this.url, (search) => {
      this.applied.push(search);
      this.url.set(search ?? undefined);
    });
  }
}

describe('normalizeSearch', () => {
  it('trims and cuts to the API limit', () => {
    expect(normalizeSearch(undefined)).toBe('');
    expect(normalizeSearch('  2 euro ')).toBe('2 euro');
    expect(normalizeSearch('a'.repeat(150))).toHaveLength(SEARCH_MAX_LENGTH);
    // No trailing space left by the cut
    expect(normalizeSearch('a'.repeat(99) + ' b')).toBe('a'.repeat(99));
  });
});

describe('syncSearchWithUrl', () => {
  let host: Host;

  beforeEach(() => {
    vi.useFakeTimers();
    host = TestBed.createComponent(Host).componentInstance;
    TestBed.tick();
  });

  afterEach(() => vi.useRealTimers());

  function type(value: string): void {
    host.control.setValue(value);
    vi.advanceTimersByTime(300);
    TestBed.tick();
  }

  it('writes the trimmed term after the pause', () => {
    type(' euro ');
    expect(host.applied).toEqual(['euro']);
    expect(host.url()).toBe('euro');
  });

  it('keeps a trailing space the user is typing', () => {
    type('2 ');
    expect(host.url()).toBe('2');
    expect(host.control.value).toBe('2 ');

    type('2 euro');
    expect(host.url()).toBe('2 euro');
  });

  it('searches the same term again after the URL dropped it', () => {
    type('euro');
    // "Clear filters" or the back button
    host.url.set(undefined);
    TestBed.tick();
    expect(host.control.value).toBe('');

    type('euro');
    expect(host.applied).toEqual(['euro', 'euro']);
    expect(host.url()).toBe('euro');
  });

  it('does not navigate when the term matches the URL', () => {
    host.url.set('euro');
    TestBed.tick();
    expect(host.control.value).toBe('euro');

    type('euro ');
    expect(host.applied).toEqual([]);
  });

  it('clears the search when the box is emptied', () => {
    type('euro');
    type('  ');
    expect(host.applied).toEqual(['euro', null]);
  });
});

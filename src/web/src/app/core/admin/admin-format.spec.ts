import { formatBytes, formatRelative } from './admin-format';

describe('formatRelative', () => {
  const now = Date.parse('2026-10-01T12:00:00Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();
  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  it('picks a unit that fits the distance', () => {
    expect(formatRelative(ago(20_000), 'en', now)).toBe('now');
    expect(formatRelative(ago(5 * MINUTE), 'en', now)).toBe('5 minutes ago');
    expect(formatRelative(ago(3 * HOUR), 'en', now)).toBe('3 hours ago');
    expect(formatRelative(ago(26 * HOUR), 'en', now)).toBe('yesterday');
    expect(formatRelative(ago(65 * DAY), 'en', now)).toBe('2 months ago');
    expect(formatRelative(ago(800 * DAY), 'en', now)).toBe('2 years ago');
  });

  it('speaks the UI language', () => {
    expect(formatRelative(ago(5 * MINUTE), 'tr', now)).toBe('5 dakika önce');
    expect(formatRelative(ago(5 * MINUTE), 'de', now)).toBe('vor 5 Minuten');
  });
});

describe('formatBytes', () => {
  it('steps in 1024s with short units', () => {
    expect(formatBytes(512, 'en')).toBe('512 byte');
    expect(formatBytes(1536, 'en')).toBe('1.5 kB');
    expect(formatBytes(5 * 1024 * 1024, 'en')).toBe('5 MB');
    expect(formatBytes(3 * 1024 ** 3, 'en')).toBe('3 GB');
  });

  it('uses the language decimal separator', () => {
    expect(formatBytes(1536, 'de')).toBe('1,5 kB');
  });
});

import { pushSessionEntry, readSessionHistory } from './sessionHistory';

const EMAIL = 'test@example.com';
const KEY = `hl_session_history_${EMAIL}`;

beforeEach(() => {
  localStorage.clear();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2025-01-01T10:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

// ── pushSessionEntry ──────────────────────────────────────────────────────────

describe('pushSessionEntry', () => {
  test('stores a login entry in localStorage', () => {
    pushSessionEntry(EMAIL, 'login');
    const history = JSON.parse(localStorage.getItem(KEY));
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ email: EMAIL, type: 'login' });
  });

  test('stores a logout entry with manual reason', () => {
    pushSessionEntry(EMAIL, 'logout', 'manual');
    const entry = JSON.parse(localStorage.getItem(KEY))[0];
    expect(entry.type).toBe('logout');
    expect(entry.reason).toBe('manual');
  });

  test('stores a logout entry with inactivity reason', () => {
    pushSessionEntry(EMAIL, 'logout', 'inactivity');
    const entry = JSON.parse(localStorage.getItem(KEY))[0];
    expect(entry.reason).toBe('inactivity');
  });

  test('does not include reason field when not provided', () => {
    pushSessionEntry(EMAIL, 'login');
    const entry = JSON.parse(localStorage.getItem(KEY))[0];
    expect(entry).not.toHaveProperty('reason');
  });

  test('records a timestamp (ts)', () => {
    pushSessionEntry(EMAIL, 'login');
    const entry = JSON.parse(localStorage.getItem(KEY))[0];
    expect(typeof entry.ts).toBe('number');
    expect(entry.ts).toBeGreaterThan(0);
  });

  test('records the device (navigator.userAgent)', () => {
    pushSessionEntry(EMAIL, 'login');
    const entry = JSON.parse(localStorage.getItem(KEY))[0];
    expect(typeof entry.device).toBe('string');
  });

  test('prepends new entries so most recent is first', () => {
    pushSessionEntry(EMAIL, 'login');
    jest.advanceTimersByTime(60_000);
    pushSessionEntry(EMAIL, 'logout', 'manual');

    const history = readSessionHistory(EMAIL);
    expect(history[0].type).toBe('logout');
    expect(history[1].type).toBe('login');
  });

  test('deduplicates same type within 10 seconds', () => {
    pushSessionEntry(EMAIL, 'login');
    jest.advanceTimersByTime(5_000); // 5s — inside dedup window
    pushSessionEntry(EMAIL, 'login');
    expect(readSessionHistory(EMAIL)).toHaveLength(1);
  });

  test('does NOT deduplicate after 10 seconds have elapsed', () => {
    pushSessionEntry(EMAIL, 'login');
    jest.advanceTimersByTime(11_000); // past dedup window
    pushSessionEntry(EMAIL, 'login');
    expect(readSessionHistory(EMAIL)).toHaveLength(2);
  });

  test('does not deduplicate different types within 10 seconds', () => {
    pushSessionEntry(EMAIL, 'login');
    jest.advanceTimersByTime(1_000);
    pushSessionEntry(EMAIL, 'logout', 'manual');
    expect(readSessionHistory(EMAIL)).toHaveLength(2);
  });

  test('caps history at 40 entries', () => {
    for (let i = 0; i < 50; i++) {
      jest.advanceTimersByTime(15_000);
      pushSessionEntry(EMAIL, i % 2 === 0 ? 'login' : 'logout', i % 2 ? 'manual' : undefined);
    }
    expect(readSessionHistory(EMAIL)).toHaveLength(40);
  });

  test('normalizes email to lowercase for storage key', () => {
    pushSessionEntry('UPPER@EXAMPLE.COM', 'login');
    const history = readSessionHistory('upper@example.com');
    expect(history).toHaveLength(1);
  });

  test('different emails have separate storage keys', () => {
    jest.advanceTimersByTime(15_000);
    pushSessionEntry('a@test.com', 'login');
    jest.advanceTimersByTime(15_000);
    pushSessionEntry('b@test.com', 'login');

    expect(readSessionHistory('a@test.com')).toHaveLength(1);
    expect(readSessionHistory('b@test.com')).toHaveLength(1);
  });

  test('handles localStorage write errors gracefully', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => pushSessionEntry(EMAIL, 'login')).not.toThrow();
  });

  test('handles corrupt existing localStorage data gracefully', () => {
    localStorage.setItem(KEY, 'not-valid-json}}}');
    expect(() => pushSessionEntry(EMAIL, 'login')).not.toThrow();
  });
});

// ── readSessionHistory ────────────────────────────────────────────────────────

describe('readSessionHistory', () => {
  test('returns empty array when no history exists', () => {
    expect(readSessionHistory('nobody@example.com')).toEqual([]);
  });

  test('returns stored entries in order', () => {
    pushSessionEntry(EMAIL, 'login');
    const history = readSessionHistory(EMAIL);
    expect(history).toHaveLength(1);
    expect(history[0].type).toBe('login');
  });

  test('returns empty array for null email', () => {
    expect(readSessionHistory(null)).toEqual([]);
  });

  test('returns empty array for empty string email', () => {
    expect(readSessionHistory('')).toEqual([]);
  });

  test('returns empty array when localStorage contains invalid JSON', () => {
    localStorage.setItem(KEY, '[[[[broken');
    expect(readSessionHistory(EMAIL)).toEqual([]);
  });

  test('returns multiple entries in correct order', () => {
    pushSessionEntry(EMAIL, 'login');
    jest.advanceTimersByTime(15_000);
    pushSessionEntry(EMAIL, 'logout', 'manual');

    const history = readSessionHistory(EMAIL);
    expect(history).toHaveLength(2);
    expect(history[0].type).toBe('logout');
    expect(history[1].type).toBe('login');
  });
});

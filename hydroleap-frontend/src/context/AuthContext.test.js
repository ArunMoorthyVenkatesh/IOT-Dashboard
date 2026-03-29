import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

// AuthProvider does NOT call useNavigate internally; navigate is passed as
// a parameter to logout(). No Router wrapper is required.

const mockNavigate = jest.fn();

beforeEach(() => {
  localStorage.clear();
  mockNavigate.mockClear();
});

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

// ── Initial state ─────────────────────────────────────────────────────────────

describe('initial state', () => {
  test('profile and role are null when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.profile).toBeNull();
    expect(result.current.role).toBeNull();
  });

  test('isAuth is false when not logged in', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuth).toBe(false);
  });

  test('reads existing profile from localStorage on mount', () => {
    const profile = { email: 'user@test.com', name: 'Test User' };
    localStorage.setItem('profile', JSON.stringify(profile));
    localStorage.setItem('role', 'user');

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.profile.email).toBe('user@test.com');
    expect(result.current.role).toBe('user');
    expect(result.current.isAuth).toBe(true);
  });

  test('handles corrupt profile JSON gracefully', () => {
    localStorage.setItem('profile', '{not valid json');
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.profile).toBeNull();
  });

  test('exposes login and logout functions', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });
});

// ── login() ───────────────────────────────────────────────────────────────────

describe('login()', () => {
  test('stores profile in localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const profile = { email: 'user@test.com', name: 'Test' };
    act(() => { result.current.login({ profile, token: 'tok', role: 'user' }); });
    expect(localStorage.getItem('profile')).toBe(JSON.stringify(profile));
  });

  test('stores user token in localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => { result.current.login({ profile: { email: 'u@t.com' }, token: 'user-jwt', role: 'user' }); });
    expect(localStorage.getItem('token')).toBe('user-jwt');
  });

  test('stores adminToken in localStorage for admin login', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.login({
        profile: { email: 'admin@h.com' },
        adminToken: 'admin-jwt',
        role: 'admin',
      });
    });
    expect(localStorage.getItem('adminToken')).toBe('admin-jwt');
  });

  test('stores role in localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => { result.current.login({ profile: { email: 'u@t.com' }, token: 'tok', role: 'user' }); });
    expect(localStorage.getItem('role')).toBe('user');
  });

  test('updates context profile state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const profile = { email: 'user@test.com' };
    act(() => { result.current.login({ profile, token: 'tok', role: 'user' }); });
    expect(result.current.profile).toEqual(profile);
  });

  test('sets isAuth to true after login', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.login({ profile: { email: 'u@t.com' }, token: 'tok', role: 'user' });
    });
    expect(result.current.isAuth).toBe(true);
  });

  test('updates role in context state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => { result.current.login({ profile: { email: 'a@h.com' }, adminToken: 'atk', role: 'admin' }); });
    expect(result.current.role).toBe('admin');
  });
});

// ── logout() ──────────────────────────────────────────────────────────────────

describe('logout()', () => {
  test('clears token from localStorage', () => {
    localStorage.setItem('token', 'tok');
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => { result.current.logout(); });
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('clears adminToken from localStorage', () => {
    localStorage.setItem('adminToken', 'atk');
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => { result.current.logout(); });
    expect(localStorage.getItem('adminToken')).toBeNull();
  });

  test('clears profile from localStorage', () => {
    localStorage.setItem('profile', '{"email":"u@t.com"}');
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => { result.current.logout(); });
    expect(localStorage.getItem('profile')).toBeNull();
  });

  test('clears role from localStorage', () => {
    localStorage.setItem('role', 'user');
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => { result.current.logout(); });
    expect(localStorage.getItem('role')).toBeNull();
  });

  test('resets profile to null in context', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.login({ profile: { email: 'u@t.com' }, token: 'tok', role: 'user' });
    });
    act(() => { result.current.logout(); });
    expect(result.current.profile).toBeNull();
  });

  test('resets role to null in context', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.login({ profile: { email: 'u@t.com' }, token: 'tok', role: 'user' });
    });
    act(() => { result.current.logout(); });
    expect(result.current.role).toBeNull();
  });

  test('sets isAuth to false after logout', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.login({ profile: { email: 'u@t.com' }, token: 'tok', role: 'user' });
    });
    act(() => { result.current.logout(); });
    expect(result.current.isAuth).toBe(false);
  });

  test('calls navigate("/login") when navigate is provided', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => { result.current.logout(mockNavigate); });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('does not throw when navigate is omitted', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(() => { act(() => { result.current.logout(); }); }).not.toThrow();
  });
});

// ── useAuth() error handling ──────────────────────────────────────────────────

describe('useAuth() without AuthProvider', () => {
  test('throws a descriptive error', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used inside <AuthProvider>'
    );
    consoleSpy.mockRestore();
  });
});

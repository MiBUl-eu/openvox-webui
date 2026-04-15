import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { usePermissionsStore } from './permissionsStore';

export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const AUTH_LOGOUT_REASON_KEY = 'auth_logout_reason';
const LAST_ACTIVITY_STORAGE_KEY = 'auth_last_activity_at';

export function recordSessionActivity(timestamp = Date.now()) {
  localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, timestamp.toString());
}

export function getLastSessionActivity(): number {
  const rawValue = localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY);
  const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : NaN;
  return Number.isFinite(parsedValue) ? parsedValue : Date.now();
}

export function consumeSessionLogoutReason(): string | null {
  const reason = sessionStorage.getItem(AUTH_LOGOUT_REASON_KEY);
  if (reason) {
    sessionStorage.removeItem(AUTH_LOGOUT_REASON_KEY);
  }
  return reason;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string, refreshToken?: string) => void;
  logout: (reason?: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user: User, token: string, refreshToken?: string) => {
        localStorage.setItem('auth_token', token);
        if (refreshToken !== undefined) {
          localStorage.setItem('refresh_token', refreshToken);
        }
        sessionStorage.removeItem(AUTH_LOGOUT_REASON_KEY);
        recordSessionActivity();
        set({ user, token, isAuthenticated: true });
      },

      logout: (reason?: string) => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
        if (reason) {
          sessionStorage.setItem(AUTH_LOGOUT_REASON_KEY, reason);
        }
        // Clear permissions when logging out
        usePermissionsStore.getState().clearPermissions();
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

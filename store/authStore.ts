import { create } from 'zustand';
import { clearAuth } from '@/lib/storage';

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  role: string;
  token: string;
};

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  /** The last session ended because it expired; the login screen says so. */
  sessionExpired: boolean;
  setUser: (user: AuthUser) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  /**
   * Like logout, but the login screen tells the user their session expired. With `token`, only that
   * session ends: a 401 for an old token must not end a session started after it.
   */
  expireSession: (token?: string) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  sessionExpired: false,
  setUser: (user) => set({ user, sessionExpired: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: async () => {
    await clearAuth();
    set({ user: null });
  },
  expireSession: async (token) => {
    const current = get().user;
    // Requests still in flight answer 401 after the session ended; they must not raise the notice again.
    if (!current || (token !== undefined && token !== current.token)) return;
    // The screen goes to the login first; a storage failure must not keep the user on an expired session.
    set({ user: null, sessionExpired: true });
    try {
      await clearAuth();
    } catch (e) {
      console.error('Could not clear the stored session after it expired', e);
    }
  },
}));

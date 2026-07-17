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
  setUser: (user: AuthUser) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: async () => {
    await clearAuth();
    set({ user: null });
  },
}));

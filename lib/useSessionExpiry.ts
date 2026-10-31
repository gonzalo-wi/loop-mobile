import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { startSessionWatch } from './sessionExpiry';

/** While logged in, ends the session once the token expires, even on a screen that makes no requests. */
export function useSessionExpiry() {
  const token = useAuthStore((s) => s.user?.token);
  const expireSession = useAuthStore((s) => s.expireSession);

  useEffect(() => {
    if (!token) return;
    return startSessionWatch(token, {
      onExpired: () => void expireSession(),
      now: Date.now,
      subscribeForeground: (onForeground) => {
        const subscription = AppState.addEventListener('change', (state) => {
          if (state === 'active') onForeground();
        });
        return () => subscription.remove();
      },
    });
  }, [token, expireSession]);
}

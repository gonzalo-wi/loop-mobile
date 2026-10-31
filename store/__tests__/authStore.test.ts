jest.mock('@/lib/storage', () => ({ clearAuth: jest.fn(() => Promise.resolve()) }));

import { useAuthStore } from '../authStore';

const user = { id: '1', name: 'Ctrl', username: 'ctrl', role: 'CONTROLADOR', token: 't' };

describe('authStore.expireSession', () => {
  beforeEach(() => useAuthStore.setState({ user: null, sessionExpired: false }));

  it('logs out and flags the session as expired', async () => {
    useAuthStore.getState().setUser(user);

    await useAuthStore.getState().expireSession();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().sessionExpired).toBe(true);
  });

  it('ignores a late 401 when the session already ended', async () => {
    await useAuthStore.getState().expireSession();

    expect(useAuthStore.getState().sessionExpired).toBe(false);
  });

  it('does not flag a manual logout as expired', async () => {
    useAuthStore.getState().setUser(user);

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().sessionExpired).toBe(false);
  });

  it('ignores a 401 for an older token than the current session', async () => {
    useAuthStore.getState().setUser({ ...user, token: 'new' });

    await useAuthStore.getState().expireSession('old');

    expect(useAuthStore.getState().user?.token).toBe('new');
    expect(useAuthStore.getState().sessionExpired).toBe(false);
  });

  it('still ends the session when clearing the storage fails', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { clearAuth } = require('@/lib/storage');
    clearAuth.mockImplementationOnce(() => Promise.reject(new Error('keystore locked')));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    useAuthStore.getState().setUser(user);

    await useAuthStore.getState().expireSession('t');

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().sessionExpired).toBe(true);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('clears the flag on the next login', async () => {
    useAuthStore.getState().setUser(user);
    await useAuthStore.getState().expireSession();

    useAuthStore.getState().setUser(user);

    expect(useAuthStore.getState().sessionExpired).toBe(false);
  });
});

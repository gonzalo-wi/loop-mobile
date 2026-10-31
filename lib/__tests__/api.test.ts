jest.mock('@/lib/storage', () => ({ getToken: jest.fn(), clearAuth: jest.fn(() => Promise.resolve()) }));

const expireSession = jest.fn();
jest.mock('@/store/authStore', () => ({
  useAuthStore: { getState: () => ({ expireSession }) },
}));

import { ApiError, handleResponseError } from '../api';

function axiosError(status: number, url: string, message?: string) {
  return {
    message: 'Request failed',
    config: { url, headers: { Authorization: 'Bearer req-token' } },
    response: { status, data: message ? { message } : {} },
  };
}

describe('handleResponseError', () => {
  it('expires the session the request was made with on a 401', async () => {
    await expect(handleResponseError(axiosError(401, '/stock-controls/1'))).rejects.toBeInstanceOf(ApiError);
    expect(expireSession).toHaveBeenCalledWith('req-token');
  });

  it('keeps the message and the session on a login 401 (wrong password)', async () => {
    await expect(handleResponseError(axiosError(401, '/auth/login', 'Invalid username or password')))
      .rejects.toMatchObject({ status: 401, message: 'Invalid username or password' });
    expect(expireSession).not.toHaveBeenCalled();
  });

  it('keeps the session on a 403', async () => {
    await expect(handleResponseError(axiosError(403, '/app/version', 'Forbidden'))).rejects.toMatchObject({ status: 403 });
    expect(expireSession).not.toHaveBeenCalled();
  });
});

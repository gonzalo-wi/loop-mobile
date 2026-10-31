jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  deleteAsync: jest.fn(() => Promise.resolve()),
  downloadAsync: jest.fn(),
  readAsStringAsync: jest.fn(() => Promise.resolve('{"message":"Authentication required"}')),
}));
jest.mock('expo-intent-launcher', () => ({}));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('@/lib/storage', () => ({ getToken: jest.fn(() => Promise.resolve('tok')) }));
jest.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.status = status;
    }
  },
}));

const expireSession = jest.fn();
jest.mock('@/store/authStore', () => ({
  useAuthStore: { getState: () => ({ expireSession }) },
}));

import { downloadRemito } from '../remitoApi';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const FileSystem = require('expo-file-system/legacy');

describe('downloadRemito', () => {
  it('expires the session when the download answers 401', async () => {
    FileSystem.downloadAsync.mockResolvedValueOnce({ status: 401, uri: 'file:///cache/r.pdf' });

    await expect(downloadRemito('route-1', '2026-10-31')).rejects.toMatchObject({ status: 401 });
    expect(expireSession).toHaveBeenCalledWith('tok');
  });

  it('keeps the session on other errors', async () => {
    FileSystem.downloadAsync.mockResolvedValueOnce({ status: 404, uri: 'file:///cache/r.pdf' });

    await expect(downloadRemito('route-1', '2026-10-31')).rejects.toMatchObject({ status: 404 });
    expect(expireSession).not.toHaveBeenCalled();
  });
});

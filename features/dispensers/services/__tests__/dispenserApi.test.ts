import { createDispenserMovement } from '../dispenserApi';
import type { CreateMovementPayload } from '../../types';

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { api } = require('@/lib/api');

const basePayload: CreateMovementPayload = {
  type: 'LOAD',
  routeCode: 'R-1',
  technician: 'Juan',
  serials: ['SN-001'],
};

describe('createDispenserMovement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.post.mockResolvedValue({ data: { data: { id: '1' }, message: 'ok' } });
  });

  it('posts loadDurationSeconds in the body when it is provided', async () => {
    await createDispenserMovement({ ...basePayload, loadDurationSeconds: 95 });

    expect(api.post).toHaveBeenCalledWith('/dispenser-movements', {
      ...basePayload,
      loadDurationSeconds: 95,
    });
  });

  it('keeps a duration of 0 seconds in the body', async () => {
    await createDispenserMovement({ ...basePayload, loadDurationSeconds: 0 });

    expect(api.post.mock.calls[0][1].loadDurationSeconds).toBe(0);
  });

  it('omits the duration when the timer has no value', async () => {
    await createDispenserMovement({ ...basePayload, loadDurationSeconds: undefined });

    const body = api.post.mock.calls[0][1];
    expect(JSON.parse(JSON.stringify(body))).not.toHaveProperty('loadDurationSeconds');
  });
});

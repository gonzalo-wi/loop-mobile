import { isExpired, startSessionWatch, tokenExpiresAt } from '../sessionExpiry';

const b64url = (o: object) =>
  Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const token = (claims: object) => `${b64url({ alg: 'HS256' })}.${b64url(claims)}.sig`;

const EXP = 1793502000; // 2026-10-31T03:00:00Z, midnight in Argentina

describe('tokenExpiresAt', () => {
  it('reads the token exp in milliseconds', () => {
    expect(tokenExpiresAt(token({ sub: 'ctrl', exp: EXP }))).toBe(EXP * 1000);
  });

  it('returns null when the token is unreadable or has no exp', () => {
    expect(tokenExpiresAt('not-a-token')).toBeNull();
    expect(tokenExpiresAt('a.%%%.c')).toBeNull();
    expect(tokenExpiresAt(token({ sub: 'ctrl' }))).toBeNull();
  });
});

describe('isExpired', () => {
  it('expires exactly at exp', () => {
    expect(isExpired(token({ exp: EXP }), EXP * 1000 - 1)).toBe(false);
    expect(isExpired(token({ exp: EXP }), EXP * 1000)).toBe(true);
  });

  it('never expires an unreadable token locally: the backend decides with a 401', () => {
    expect(isExpired('garbage', Date.now())).toBe(false);
  });
});

describe('startSessionWatch', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function setup(expMs: number) {
    let foreground: () => void = () => undefined;
    const onExpired = jest.fn();
    const stop = startSessionWatch(token({ exp: expMs / 1000 }), {
      onExpired,
      now: () => Date.now(),
      subscribeForeground: (cb) => {
        foreground = cb;
        return () => {
          foreground = () => undefined;
        };
      },
    });
    return { onExpired, stop, foreground: () => foreground() };
  }

  it('ends the session right away when it already expired', () => {
    jest.setSystemTime(EXP * 1000 + 5_000);
    const { onExpired } = setup(EXP * 1000);
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('ends the session within a minute when it expires with the app open', () => {
    jest.setSystemTime(EXP * 1000 - 10_000);
    const { onExpired } = setup(EXP * 1000);
    expect(onExpired).not.toHaveBeenCalled();

    jest.advanceTimersByTime(60_000);
    expect(onExpired).toHaveBeenCalled();
  });

  it('checks when the app returns to the foreground', () => {
    jest.setSystemTime(EXP * 1000 - 10_000);
    const { onExpired, foreground } = setup(EXP * 1000);

    jest.setSystemTime(EXP * 1000 + 1);
    foreground();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('stops checking once stopped', () => {
    jest.setSystemTime(EXP * 1000 - 10_000);
    const { onExpired, stop, foreground } = setup(EXP * 1000);

    stop();
    jest.setSystemTime(EXP * 1000 + 1);
    jest.advanceTimersByTime(60_000);
    foreground();
    expect(onExpired).not.toHaveBeenCalled();
  });
});

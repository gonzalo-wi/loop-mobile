import { getOrderSteps } from '../orderSteps';

const states = (status: Parameters<typeof getOrderSteps>[0]) => getOrderSteps(status).map((s) => s.state);

describe('getOrderSteps', () => {
  it('marks only the first step as current while pending', () => {
    expect(states('PENDING')).toEqual(['current', 'upcoming', 'upcoming']);
  });
  it('checks the first step and highlights preparation while in progress', () => {
    expect(states('IN_PROGRESS')).toEqual(['done', 'current', 'upcoming']);
  });
  it('checks every step once completed', () => {
    expect(states('COMPLETED')).toEqual(['done', 'done', 'done']);
  });
  it('fills the connector after a step only when the next one was reached', () => {
    expect(getOrderSteps('IN_PROGRESS').map((s) => s.lineAfterFilled)).toEqual([true, false, false]);
    expect(getOrderSteps('COMPLETED').map((s) => s.lineAfterFilled)).toEqual([true, true, false]);
  });
  it('treats an unknown status as pending', () => {
    expect(states('ARCHIVED' as never)).toEqual(['current', 'upcoming', 'upcoming']);
  });
});

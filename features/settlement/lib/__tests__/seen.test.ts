import { hasUnseenNews, settlementNews } from '../seen';
import type { DriverSettlement, RouteSettlement, SettlementFigures } from '../../types';

const BASE: SettlementFigures = {
  expectedCash: 90000,
  expectedChecks: 0,
  expectedWithholdings: 0,
  expectedTotal: 90000,
  depositedCash: 0,
  confirmedChecks: 0,
  confirmedWithholdings: 0,
  totalReceived: 0,
  difference: null,
  differenceType: null,
  statusGroup: 'PENDING',
  expectedUpdatedAt: null,
  lastDepositAt: null,
  cashDifference: null,
  depositsCheckedAt: null,
  depositsLive: true,
};

function settlement(...routes: RouteSettlement[]): DriverSettlement {
  return { date: '2026-11-05', routes };
}

function available(routeId: string, figures: Partial<SettlementFigures>): RouteSettlement {
  return { routeId, routeCode: `Rto ${routeId}`, state: 'AVAILABLE', figures: { ...BASE, ...figures } };
}

describe('settlementNews', () => {
  it('has nothing to tell before a deposit or a final difference', () => {
    expect(settlementNews(settlement(available('1', {})))).toEqual([]);
    expect(settlementNews(settlement({ routeId: '2', routeCode: 'Rto 2', state: 'WAITING_ENTRY', figures: null }))).toEqual([]);
  });

  it('reports a deposit and, later, the final difference as separate news', () => {
    const deposited = settlementNews(settlement(available('1', { depositedCash: 91500, lastDepositAt: '2026-11-05T18:42:00Z' })));
    const reviewed = settlementNews(
      settlement(available('1', { depositedCash: 91500, lastDepositAt: '2026-11-05T18:42:00Z', difference: 1500 })),
    );

    expect(deposited).toHaveLength(1);
    expect(reviewed).toHaveLength(2);
    expect(reviewed).toEqual(expect.arrayContaining(deposited));
  });

  it('treats a second deposit as new', () => {
    const first = settlementNews(settlement(available('1', { depositedCash: 50000, lastDepositAt: '2026-11-05T18:00:00Z' })));
    const second = settlementNews(settlement(available('1', { depositedCash: 91500, lastDepositAt: '2026-11-05T19:10:00Z' })));

    expect(hasUnseenNews(second, first)).toBe(true);
  });
});

describe('hasUnseenNews', () => {
  it('is false when everything was already seen', () => {
    const news = ['a', 'b'];
    expect(hasUnseenNews(news, ['a', 'b', 'c'])).toBe(false);
    expect(hasUnseenNews([], [])).toBe(false);
  });

  it('is true when something is new', () => {
    expect(hasUnseenNews(['a', 'b'], ['a'])).toBe(true);
  });
});

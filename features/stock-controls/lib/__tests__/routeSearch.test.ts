import { filterRoutesByCode } from '../routeSearch';
import type { Route } from '../../types';

function route(id: string, code: string, truckPlate: string | null = null): Route {
  return {
    id,
    code,
    branchId: 'b1',
    branchName: 'Rto Central',
    branchCode: '134',
    driverId: null,
    driverName: null,
    truckPlate,
    active: true,
  };
}

describe('filterRoutesByCode', () => {
  const routes = [
    route('1', 'Rto 12', 'AE134KL'),
    route('2', 'Rto 134', 'AB001CD'),
    route('3', 'Rto 1345', null),
  ];

  it('keeps only routes whose code matches, ignoring plates', () => {
    expect(filterRoutesByCode(routes, '134').map((r) => r.id)).toEqual(['2', '3']);
  });

  it('is case-insensitive and trims the term', () => {
    expect(filterRoutesByCode(routes, '  RTO 12 ').map((r) => r.id)).toEqual(['1']);
  });

  it('returns every route when the term is empty', () => {
    expect(filterRoutesByCode(routes, '   ')).toEqual(routes);
  });
});

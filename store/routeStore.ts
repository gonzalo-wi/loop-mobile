import { create } from 'zustand';

type DriverRoute = {
  routeId: string;
  routeCode: string;
  branchId: string;
  branchName: string;
  truckPlate?: string | null;
};

type RouteState = {
  route: DriverRoute | null;
  pendingCount: number;
  setRoute: (route: DriverRoute | null) => void;
  setPendingCount: (count: number) => void;
};

export const useRouteStore = create<RouteState>((set) => ({
  route: null,
  pendingCount: 0,
  setRoute: (route) => set({ route }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
}));

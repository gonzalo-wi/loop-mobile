import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const ROUTE_KEY = 'driver_route';
const SETTLEMENT_SEEN_KEY = 'settlement_seen';

type StoredUser = {
  id: string;
  name: string;
  username: string;
  role: string;
};

export type StoredRoute = {
  routeId: string;
  routeCode: string;
  branchId: string;
  branchName: string;
  /** Patente del camión asignado. Puede faltar en sesiones viejas (se completa al re-loguear). */
  truckPlate?: string | null;
};

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveUser(user: StoredUser): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export async function saveRoute(route: StoredRoute): Promise<void> {
  await SecureStore.setItemAsync(ROUTE_KEY, JSON.stringify(route));
}

export async function getStoredRoute(): Promise<StoredRoute | null> {
  const raw = await SecureStore.getItemAsync(ROUTE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredRoute;
  } catch {
    return null;
  }
}

export async function clearRoute(): Promise<void> {
  await SecureStore.deleteItemAsync(ROUTE_KEY);
}

/** Novedades de la rendición que el repartidor ya vio (ver features/settlement/lib/seen.ts). */
export async function getSettlementSeen(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(SETTLEMENT_SEEN_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch (e) {
    // Losing the list only means the badge may show again for something already seen.
    console.warn('Corrupt settlement seen list, starting over', e);
    return [];
  }
}

export async function saveSettlementSeen(seen: string[]): Promise<void> {
  await SecureStore.setItemAsync(SETTLEMENT_SEEN_KEY, JSON.stringify(seen));
}

export async function clearAuth(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
    SecureStore.deleteItemAsync(ROUTE_KEY),
    SecureStore.deleteItemAsync(SETTLEMENT_SEEN_KEY),
  ]);
}

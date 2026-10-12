import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getOrders } from '@/features/driver/services/ordersApi';
import { useRouteStore } from '@/store/routeStore';
import { useAuthStore } from '@/store/authStore';
import {
  BottomBar,
  EmptyState,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
  SegmentedControl,
} from '@/components/ui';
import { OrderCard } from '@/features/driver/components/OrderCard';
import type { Order } from '@/features/driver/types';
import { C, H, R, S, T } from '@/lib/theme';
import { isoDateToDisplay } from '@/lib/dateFormat';

function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

type OrderFilter = 'PENDING' | 'DONE';

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { route } = useRouteStore();
  const { user } = useAuthStore();
  const isDriver = user?.role === 'REPARTIDOR';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('PENDING');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const today = getTodayDate();
      const params = isDriver && route
        ? { routeId: route.routeId, from: today, to: today, size: 50 }
        : { from: today, to: today, size: 100 };
      const result = await getOrders(params);
      setOrders(result.orders);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar pedidos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isDriver, route]);

  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(() => load(true), 12_000);
      return () => clearInterval(interval);
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const today = isoDateToDisplay(getTodayDate());

  // Filtro local para admin/picker
  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const doneOrders    = orders.filter((o) => o.status === 'IN_PROGRESS' || o.status === 'COMPLETED');
  const visibleOrders = isDriver
    ? orders
    : activeFilter === 'PENDING' ? pendingOrders : doneOrders;

  const emptyTitle = isDriver ? 'Sin pedidos hoy' : 'Sin pedidos';
  const emptySubtext = isDriver
    ? 'Creá uno con el botón de abajo o pedí una sugerencia.'
    : activeFilter === 'PENDING'
      ? 'No hay pedidos pendientes por preparar'
      : 'Todavía no se preparó ningún pedido hoy';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="Pedidos" subtitle={`Hoy · ${today}`} />

      {!isDriver && (
        <View style={styles.segment}>
          <SegmentedControl
            tone="onCream"
            value={activeFilter}
            onChange={setActiveFilter}
            options={[
              { value: 'PENDING', label: 'Pendientes', activeColor: C.orange, badge: pendingOrders.length },
              { value: 'DONE', label: 'Preparados', activeColor: C.greenDot, badge: doneOrders.length },
            ]}
          />
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <EmptyState icon="cloud-offline-outline" title="No se pudieron cargar los pedidos" hint={error} />
          <View style={styles.retryWrap}>
            <SecondaryButton title="Reintentar" icon="refresh" onPress={() => load()} />
          </View>
        </View>
      ) : isDriver && !route ? (
        <View style={styles.centered}>
          <EmptyState icon="warning-outline" title="Sin reparto asignado" hint="Contactá al administrador." />
        </View>
      ) : (
        <FlatList
          data={visibleOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, isDriver && { paddingBottom: BOTTOM_BAR_SPACE }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />
          }
          ListHeaderComponent={
            isDriver ? (
              <View style={styles.header}>
                <Pressable
                  style={({ pressed }) => [styles.suggest, pressed && styles.pressed]}
                  onPress={() => router.push('/create-order?suggest=1')}
                  accessibilityRole="button"
                >
                  <View style={styles.suggestIcon}>
                    <Ionicons name="sparkles-outline" size={H.icon} color={C.white} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.suggestTitle}>Sugerir pedido</Text>
                    <Text style={styles.suggestHint}>Repetí lo del mismo día de la semana pasada</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={C.ink2} />
                </Pressable>
                {visibleOrders.length > 0 ? (
                  <Text style={styles.sectionTitle} accessibilityRole="header">De hoy</Text>
                ) : null}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => router.push(`/order-detail?id=${item.id}`)}
              showStepper={isDriver}
            />
          )}
          ListEmptyComponent={
            <EmptyState icon="cart-outline" title={emptyTitle} hint={emptySubtext} style={styles.empty} />
          }
        />
      )}

      {isDriver && (
        <BottomBar aboveTabBar>
          <View style={styles.flex}>
            <PrimaryButton title="Nuevo pedido" icon="add" onPress={() => router.push('/create-order')} />
          </View>
        </BottomBar>
      )}
    </View>
  );
}

// Primary button + the bottom bar's vertical padding, so the last card isn't hidden.
const BOTTOM_BAR_SPACE = H.primaryButton + S.md * 2;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  segment: { paddingHorizontal: S.gutter, paddingBottom: S.md },
  list: { paddingHorizontal: S.gutter, paddingBottom: S.lg, gap: S.md, flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', padding: S.gutter, gap: S.lg },
  retryWrap: { alignSelf: 'center' },
  empty: { flex: 1 },

  header: { gap: S.lg },
  suggest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md + 2,
    padding: S.lg,
    borderRadius: R.card,
    backgroundColor: C.white,
  },
  suggestIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestTitle: { ...T.data, color: C.navy },
  suggestHint: { ...T.secondary, fontFamily: T.body.fontFamily, fontSize: T.body.fontSize, color: C.ink2 },
  sectionTitle: { ...T.section, color: C.navy, marginTop: S.xs },
});

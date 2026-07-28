import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getOrders } from '@/features/driver/services/ordersApi';
import { useRouteStore } from '@/store/routeStore';
import { useAuthStore } from '@/store/authStore';
import { HeroHeader } from '@/components/HeroHeader';
import { OrderStatusStepper } from '@/features/driver/components/OrderStatusStepper';
import type { Order, OrderStatus } from '@/features/driver/types';
import { C, R, S, F, W, Shdw } from '@/lib/theme';

function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const STATUS_CHIP: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:     { label: 'Pendiente',      color: C.warning, bg: C.warningLight },
  IN_PROGRESS: { label: 'En preparación', color: C.primary, bg: C.primaryLight },
  COMPLETED:   { label: 'Completado',     color: C.entry,   bg: C.entryLight   },
};

// ─── Segmented filter (solo admin/picker) ────────────────────────────────────

type OrderFilter = 'PENDING' | 'DONE';

function SegmentedFilter({
  value,
  onChange,
  pendingCount,
  doneCount,
}: {
  value: OrderFilter;
  onChange: (v: OrderFilter) => void;
  pendingCount: number;
  doneCount: number;
}) {
  const options: { key: OrderFilter; label: string; count: number; color: string }[] = [
    { key: 'PENDING', label: 'Pendientes', count: pendingCount, color: C.warning },
    { key: 'DONE',    label: 'Preparados', count: doneCount,    color: C.entry   },
  ];

  return (
    <View style={filter.container}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[filter.pill, active && { backgroundColor: opt.color }]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.75}
          >
            <Text style={[filter.label, active && filter.labelActive]}>
              {opt.label}
            </Text>
            <View style={[filter.badge, active ? filter.badgeActive : { backgroundColor: active ? 'rgba(255,255,255,0.25)' : C.border }]}>
              <Text style={[filter.badgeText, active && filter.badgeTextActive]}>
                {opt.count}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

function OrderCard({
  order,
  onPress,
  showStepper,
}: {
  order: Order;
  onPress: () => void;
  showStepper: boolean;
}) {
  const totalItems = order.items.length;
  const chip = STATUS_CHIP[order.status] ?? { label: order.status, color: C.textSub, bg: C.inputBg };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <View style={styles.cartIcon}>
          <Ionicons name="cart" size={18} color={C.primary} />
        </View>
        <View style={styles.cardTopText}>
          <Text style={styles.cardRoute}>Reparto {order.routeCode}</Text>
          <Text style={styles.cardMeta}>
            {totalItems} producto{totalItems !== 1 ? 's' : ''} · {formatTime(order.createdAt)}
          </Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: chip.bg }]}>
          <Text style={[styles.statusChipText, { color: chip.color }]}>{chip.label}</Text>
        </View>
      </View>

      {order.observations ? (
        <Text style={styles.cardObs} numberOfLines={1}>{order.observations}</Text>
      ) : null}

      {showStepper && (
        <View style={styles.stepperWrap}>
          <OrderStatusStepper status={order.status} />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function OrdersScreen() {
  const router = useRouter();
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

  const today = getTodayDate().split('-').reverse().join('/');

  // Filtro local para admin/picker
  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const doneOrders    = orders.filter((o) => o.status === 'IN_PROGRESS' || o.status === 'COMPLETED');
  const visibleOrders = isDriver
    ? orders
    : activeFilter === 'PENDING' ? pendingOrders : doneOrders;

  const emptySubtext = isDriver
    ? 'Creá un nuevo pedido con el botón de abajo'
    : activeFilter === 'PENDING'
      ? 'No hay pedidos pendientes por preparar'
      : 'Todavía no se preparó ningún pedido hoy';

  return (
    <View style={styles.screen}>
      <HeroHeader title="Pedidos" subtitle={`Hoy · ${today}`} />

      {!isDriver && (
        <SegmentedFilter
          value={activeFilter}
          onChange={setActiveFilter}
          pendingCount={pendingOrders.length}
          doneCount={doneOrders.length}
        />
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => load()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : isDriver && !route ? (
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={40} color={C.warning} />
          <Text style={styles.noRouteText}>Sin reparto asignado</Text>
        </View>
      ) : (
        <FlatList
          data={visibleOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, isDriver && styles.listWithFab]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          }
          ListHeaderComponent={
            isDriver ? (
              <TouchableOpacity
                style={styles.suggestCard}
                onPress={() => router.push('/create-order?suggest=1')}
                activeOpacity={0.9}
              >
                <View style={styles.suggestIc}>
                  <Ionicons name="sparkles" size={20} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestTt}>Sugerir pedido</Text>
                  <Text style={styles.suggestDs}>Repetí lo del mismo día la semana pasada</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
              </TouchableOpacity>
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
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cart-outline" size={40} color={C.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Sin pedidos</Text>
              <Text style={styles.emptySub}>{emptySubtext}</Text>
            </View>
          }
        />
      )}

      {isDriver && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/create-order')}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.fabText}>Nuevo Pedido</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  listWithFab: { paddingBottom: 100 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: C.danger, fontSize: F.base, textAlign: 'center', marginBottom: 14 },
  retryBtn: { paddingHorizontal: 22, paddingVertical: 10, backgroundColor: C.primary, borderRadius: R.md },
  retryText: { color: '#fff', fontSize: F.base, fontWeight: W.bold },
  noRouteText: { fontSize: F.base, color: C.textMuted, marginTop: 12, textAlign: 'center' },

  suggestCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: R.lg, padding: 14,
    borderWidth: 1, borderColor: '#DBE4FF', ...Shdw.card,
  },
  suggestIc: {
    width: 42, height: 42, borderRadius: R.md,
    backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  suggestTt: { fontSize: F.md, fontWeight: W.extra, color: C.text },
  suggestDs: { fontSize: F.sm, color: C.textMuted, fontWeight: W.medium, marginTop: 1 },

  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: 15, gap: 12, ...Shdw.card },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartIcon: {
    width: 38, height: 38, borderRadius: R.sm,
    backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  cardTopText: { flex: 1, gap: 2 },
  cardRoute: { fontSize: F.md, fontWeight: W.extra, color: C.text },
  cardMeta: { fontSize: F.sm, color: C.textMuted, fontWeight: W.medium },
  cardObs: { fontSize: F.sm, color: C.textMuted, fontStyle: 'italic', marginTop: -4 },
  statusChip: { borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusChipText: { fontSize: F.xs + 1, fontWeight: W.bold },
  stepperWrap: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14 },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: {
    width: 84, height: 84, borderRadius: R.full,
    backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyTitle: { fontSize: 17, fontWeight: W.extra, color: C.textSub },
  emptySub: { fontSize: F.sm, color: C.textMuted, marginTop: 6, textAlign: 'center' },

  fab: {
    position: 'absolute', bottom: 24, right: 20, left: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: R.lg, paddingVertical: 16, ...Shdw.float,
  },
  fabText: { color: '#fff', fontSize: F.md, fontWeight: W.extra },
});

const filter = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 2,
    backgroundColor: C.inputBg,
    borderRadius: R.lg,
    padding: 4,
    gap: 2,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: R.md,
    gap: 7,
  },
  label: { fontSize: F.sm, fontWeight: W.semibold, color: C.textSub },
  labelActive: { color: '#fff', fontWeight: W.extra },
  badge: {
    borderRadius: R.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: C.border,
    minWidth: 22,
    alignItems: 'center',
  },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeText: { fontSize: F.xs, fontWeight: W.bold, color: C.textSub },
  badgeTextActive: { color: '#fff' },
});

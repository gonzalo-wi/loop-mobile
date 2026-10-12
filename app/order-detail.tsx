import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOrder, startOrder, completeOrder } from '@/features/driver/services/ordersApi';
import { useAuthStore } from '@/store/authStore';
import { BottomBar, EmptyState, PrimaryButton, ScreenHeader, SecondaryButton } from '@/components/ui';
import { OrderStatusBlock } from '@/features/driver/components/OrderStatusBlock';
import type { Order, OrderItem } from '@/features/driver/types';
import { C, H, R, S, T } from '@/lib/theme';

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const ACTION: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap } | null> = {
  PENDING: { label: 'Empezar a preparar', icon: 'play-circle-outline' },
  IN_PROGRESS: { label: 'Marcar como completado', icon: 'checkmark-done-circle-outline' },
  COMPLETED: null,
};

function ItemRow({ item }: { item: OrderItem }) {
  const hasBulk = item.bulkQuantity != null && item.bulkQuantity > 0;
  const hasUnit = item.unitQuantity > 0;

  return (
    <View style={styles.item}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.productName}</Text>
        <Text style={styles.itemCode}>{item.productCode}</Text>
      </View>
      {hasBulk && (
        <View style={styles.qty}>
          <Text style={styles.qtyNum}>{item.bulkQuantity}</Text>
          <Text style={styles.qtyLabel}>{item.unitsPerBulk ? `b · ${item.unitsPerBulk}u` : 'bultos'}</Text>
        </View>
      )}
      {hasUnit && (
        <View style={[styles.qty, styles.qtyUnit]}>
          <Text style={[styles.qtyNum, styles.qtyNumUnit]}>{item.unitQuantity}</Text>
          <Text style={[styles.qtyLabel, styles.qtyLabelUnit]}>uds.</Text>
        </View>
      )}
    </View>
  );
}

function AuditRow({
  icon, iconColor, verb, name, at, first,
}: { icon: keyof typeof Ionicons.glyphMap; iconColor: string; verb: string; name: string; at: string; first: boolean }) {
  return (
    <View style={[styles.auditRow, !first && styles.auditDivider]}>
      <Ionicons name={icon} size={22} color={iconColor} />
      <Text style={styles.auditText}>
        {verb} <Text style={styles.auditName}>{name}</Text>
      </Text>
      <Text style={styles.auditTime}>{formatDateTime(at)}</Text>
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const isDriver = user?.role === 'REPARTIDOR';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getOrder(id)
      .then(setOrder)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAction() {
    if (!order) return;
    setActioning(true);
    setActionError(null);
    try {
      const updated = order.status === 'PENDING'
        ? await startOrder(order.id)
        : await completeOrder(order.id);
      setOrder(updated);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Error al actualizar el pedido');
    } finally {
      setActioning(false);
    }
  }

  const header = (title: string, subtitle?: string) => (
    <ScreenHeader title={title} subtitle={subtitle} onBack={() => router.back()} />
  );

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {header('Pedido')}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {header('Pedido')}
        <View style={styles.centered}>
          <EmptyState icon="alert-circle-outline" title="No se pudo abrir el pedido" hint={error ?? 'Pedido no encontrado'} />
          <View style={styles.retryWrap}>
            <SecondaryButton title="Volver" icon="chevron-back" onPress={() => router.back()} />
          </View>
        </View>
      </View>
    );
  }

  const action = !isDriver ? ACTION[order.status] : null;
  const started = order.startedByName && order.startedAt ? { name: order.startedByName, at: order.startedAt } : null;
  const completed = order.completedByName && order.completedAt ? { name: order.completedByName, at: order.completedAt } : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {header(`Reparto ${order.routeCode}`, `Pedido · ${formatDate(order.orderDate)}`)}

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: (action ? BOTTOM_BAR_SPACE : S.xxl) + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <OrderStatusBlock status={order.status} />

        {/* Auditoría: quién hizo cada acción */}
        {(started || completed) && (
          <View style={styles.card}>
            {started && (
              <AuditRow icon="person-outline" iconColor={C.ink2} verb="Preparado por" name={started.name} at={started.at} first />
            )}
            {completed && (
              <AuditRow
                icon="checkmark-circle-outline"
                iconColor={C.greenDot}
                verb="Completado por"
                name={completed.name}
                at={completed.at}
                first={!started}
              />
            )}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Productos</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{order.items.length}</Text>
          </View>
        </View>
        {order.items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}

        {order.observations ? (
          <View style={styles.card}>
            <Text style={styles.obsLabel}>Observaciones</Text>
            <Text style={styles.obsText}>{order.observations}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Acción fija — solo para admin/picker/supervisor y estados accionables */}
      {action && (
        <BottomBar>
          <View style={styles.flex}>
            {actionError && (
              <View style={styles.actionError}>
                <Ionicons name="alert-circle-outline" size={18} color={C.redText} />
                <Text style={styles.actionErrorText}>{actionError}</Text>
              </View>
            )}
            <PrimaryButton title={action.label} icon={action.icon} onPress={handleAction} loading={actioning} />
          </View>
        </BottomBar>
      )}
    </View>
  );
}

// Primary button + the bottom bar's vertical padding, so the last product isn't hidden.
const BOTTOM_BAR_SPACE = H.primaryButton + S.md * 2 + S.lg;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: S.gutter, gap: S.md },
  centered: { flex: 1, justifyContent: 'center', padding: S.gutter, gap: S.lg },
  retryWrap: { alignSelf: 'center' },

  card: { paddingHorizontal: S.xl, paddingVertical: S.xs, borderRadius: R.card, backgroundColor: C.white },
  auditRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 56 },
  auditDivider: { borderTopWidth: 1, borderTopColor: C.line },
  auditText: { ...T.body, fontSize: T.label.fontSize, color: C.ink2, flex: 1 },
  auditName: { fontFamily: T.button.fontFamily, color: C.navy },
  auditTime: { ...T.data, color: C.navy, fontVariant: ['tabular-nums'] },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.sm },
  sectionTitle: { ...T.section, color: C.navy },
  countPill: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: S.sm,
    borderRadius: 12,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillText: { ...T.secondary, fontFamily: T.button.fontFamily, color: C.white, fontVariant: ['tabular-nums'] },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    paddingVertical: S.md,
    paddingLeft: S.xl,
    paddingRight: S.md,
    borderRadius: R.card,
    backgroundColor: C.white,
  },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { ...T.data, color: C.navy },
  itemCode: { ...T.secondary, fontFamily: T.body.fontFamily, color: C.ink2 },
  qty: {
    minWidth: 64,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    borderRadius: R.row,
    backgroundColor: C.cream,
    alignItems: 'center',
  },
  qtyUnit: { backgroundColor: C.blueLight },
  qtyNum: { ...T.screenTitle, color: C.navy, fontVariant: ['tabular-nums'] },
  qtyNumUnit: { color: C.blueText },
  qtyLabel: { ...T.secondary, color: C.ink2 },
  qtyLabelUnit: { color: C.blueText },

  obsLabel: { ...T.label, color: C.ink2, paddingTop: S.md },
  obsText: { ...T.body, color: C.navy, paddingBottom: S.md },

  actionError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    padding: S.md,
    marginBottom: S.sm,
    borderRadius: R.cell,
    backgroundColor: C.redSoft,
  },
  actionErrorText: { ...T.secondary, color: C.redText, flex: 1 },
});

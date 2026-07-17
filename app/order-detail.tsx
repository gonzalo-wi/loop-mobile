import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOrder, startOrder, completeOrder } from '@/features/driver/services/ordersApi';
import { useAuthStore } from '@/store/authStore';
import { HeroHeader } from '@/components/HeroHeader';
import { OrderStatusStepper } from '@/features/driver/components/OrderStatusStepper';
import type { Order, OrderItem } from '@/features/driver/types';
import { C, R, S, F, W, Shdw } from '@/lib/theme';

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const STATUS_INFO: Record<string, {
  label: string;
  color: string;
  bg: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = {
  PENDING: { label: 'Pendiente de preparación', color: C.warning, bg: C.warningLight, icon: 'hourglass-outline' },
  IN_PROGRESS: { label: 'En preparación', color: C.primary, bg: C.primaryLight, icon: 'construct-outline' },
  COMPLETED: { label: 'Completado', color: C.entry, bg: C.entryLight, icon: 'checkmark-done-circle-outline' },
};

const ACTION: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string } | null> = {
  PENDING: { label: 'Empezar a preparar', icon: 'play-circle-outline', color: C.primary },
  IN_PROGRESS: { label: 'Marcar como completado', icon: 'checkmark-done-circle-outline', color: C.entry },
  COMPLETED: null,
};

function ItemRow({ item }: { item: OrderItem }) {
  const hasBulk = item.bulkQuantity != null && item.bulkQuantity > 0;
  const hasUnit = item.unitQuantity > 0;

  return (
    <View style={styles.itemRow}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.productName}</Text>
        <Text style={styles.itemCode}>{item.productCode}</Text>
      </View>
      <View style={styles.itemQtys}>
        {hasBulk && (
          <View style={styles.qtyPill}>
            <Text style={styles.qtyNum}>{item.bulkQuantity}</Text>
            <Text style={styles.qtyLabel}>
              {item.unitsPerBulk ? `b · ${item.unitsPerBulk}u` : 'bultos'}
            </Text>
          </View>
        )}
        {hasUnit && (
          <View style={[styles.qtyPill, styles.qtyPillUnit]}>
            <Text style={[styles.qtyNum, styles.qtyNumUnit]}>{item.unitQuantity}</Text>
            <Text style={[styles.qtyLabel, styles.qtyLabelUnit]}>uds.</Text>
          </View>
        )}
      </View>
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

  if (loading) {
    return (
      <View style={styles.screen}>
        <HeroHeader title="Pedido" onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.screen}>
        <HeroHeader title="Pedido" onBack={() => router.back()} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'Pedido no encontrado'}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusInfo = STATUS_INFO[order.status];
  const action = !isDriver ? ACTION[order.status] : null;
  const isCompleted = order.status === 'COMPLETED';

  return (
    <View style={styles.screen}>
      <HeroHeader
        title={`Reparto ${order.routeCode}`}
        subtitle={`Pedido · ${formatDate(order.orderDate)}`}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, action && styles.scrollWithAction]}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner de estado */}
        <View style={[styles.statusBanner, { backgroundColor: statusInfo.bg }]}>
          <Ionicons name={statusInfo.icon} size={20} color={statusInfo.color} />
          <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>

        {/* Wizard */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Estado del pedido</Text>
          <View style={styles.stepperWrap}>
            <OrderStatusStepper status={order.status} />
          </View>

          {/* Auditoría: quién hizo cada acción */}
          {(order.startedByName || order.completedByName) && (
            <View style={styles.auditRow}>
              {order.startedByName && order.startedAt && (
                <View style={styles.auditItem}>
                  <Ionicons name="person-outline" size={13} color={C.textMuted} />
                  <Text style={styles.auditText}>
                    Preparado por {order.startedByName} · {formatDateTime(order.startedAt)}
                  </Text>
                </View>
              )}
              {order.completedByName && order.completedAt && (
                <View style={styles.auditItem}>
                  <Ionicons name="checkmark-circle-outline" size={13} color={C.entry} />
                  <Text style={[styles.auditText, { color: C.entry }]}>
                    Completado por {order.completedByName} · {formatDateTime(order.completedAt)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Productos */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>
            Productos · {order.items.length}
          </Text>
          {order.items.map((item, i) => (
            <View key={item.id}>
              {i > 0 && <View style={styles.separator} />}
              <ItemRow item={item} />
            </View>
          ))}
        </View>

        {/* Observaciones */}
        {order.observations ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Observaciones</Text>
            <Text style={styles.obsText}>{order.observations}</Text>
          </View>
        ) : null}

        {/* Banner completado para no-drivers (sin botón de acción) */}
        {!isDriver && isCompleted && (
          <View style={styles.completedBanner}>
            <Ionicons name="checkmark-done-circle" size={20} color={C.entry} />
            <Text style={styles.completedText}>Pedido entregado al repartidor</Text>
          </View>
        )}
      </ScrollView>

      {/* Botón de acción fijo — solo para admin/picker/supervisor y estados accionables */}
      {action && (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {actionError && (
            <View style={styles.actionErrorBanner}>
              <Ionicons name="alert-circle-outline" size={15} color={C.danger} />
              <Text style={styles.actionErrorText}>{actionError}</Text>
            </View>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: action.color },
              actioning && styles.actionBtnDisabled,
              pressed && !actioning && styles.actionBtnPressed,
            ]}
            onPress={handleAction}
            disabled={actioning}
          >
            {actioning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name={action.icon} size={22} color="#fff" />
                <Text style={styles.actionBtnText}>{action.label}</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  scrollWithAction: { paddingBottom: 110 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: C.danger, fontSize: F.base, textAlign: 'center', marginBottom: 14 },
  backBtn: { paddingHorizontal: 22, paddingVertical: 10, backgroundColor: C.primary, borderRadius: R.md },
  backBtnText: { color: '#fff', fontSize: F.base, fontWeight: W.bold },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm + 2,
    borderRadius: R.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statusLabel: { fontSize: F.md, fontWeight: W.bold },

  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 16,
    gap: 14,
    ...Shdw.card,
  },
  sectionLabel: {
    fontSize: F.xs + 1,
    fontWeight: W.extra,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stepperWrap: { paddingVertical: S.xs },

  auditRow: { gap: 6, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  auditItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  auditText: { fontSize: F.xs + 1, color: C.textMuted, fontWeight: W.medium },

  separator: { height: 1, backgroundColor: C.border, marginVertical: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: F.base, fontWeight: W.semibold, color: C.text },
  itemCode: { fontSize: F.xs, color: C.textMuted, fontWeight: W.medium, marginTop: 2 },
  itemQtys: { flexDirection: 'row', gap: 8 },
  qtyPill: {
    alignItems: 'center',
    backgroundColor: C.primaryLight,
    borderRadius: R.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 52,
  },
  qtyPillUnit: { backgroundColor: C.surfaceSunken },
  qtyNum: { fontSize: F.lg, fontWeight: W.extra, color: C.primary, lineHeight: 22 },
  qtyNumUnit: { color: C.textSub },
  qtyLabel: { fontSize: F.xs - 1, fontWeight: W.semibold, color: C.primary, textAlign: 'center' },
  qtyLabelUnit: { color: C.textMuted },

  obsText: { fontSize: F.base, color: C.textSub, lineHeight: 22 },

  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: C.entryLight,
    borderRadius: R.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,169,104,0.2)',
  },
  completedText: { fontSize: F.base, fontWeight: W.bold, color: C.entry },

  // Barra de acción fija
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
    ...Shdw.float,
  },
  actionErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.dangerLight,
    borderRadius: R.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.18)',
  },
  actionErrorText: { flex: 1, fontSize: F.sm, color: C.danger, fontWeight: W.semibold },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: R.lg,
    ...Shdw.float,
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnPressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  actionBtnText: { color: '#fff', fontSize: F.md, fontWeight: W.extra },
});

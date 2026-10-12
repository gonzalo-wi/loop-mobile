import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, H, R, S, T } from '@/lib/theme';
import type { Order } from '../types';
import { ORDER_STATUS, OrderStatusStepper } from './OrderStatusStepper';

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

type OrderCardProps = {
  order: Order;
  onPress: () => void;
  /** The driver follows the order's progress right on the card. */
  showStepper: boolean;
};

export function OrderCard({ order, onPress, showStepper }: OrderCardProps) {
  const totalItems = order.items.length;
  const status = ORDER_STATUS[order.status] ?? ORDER_STATUS.PENDING;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Pedido del reparto ${order.routeCode}, ${status.label}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={styles.icon}>
          <Ionicons name="cart-outline" size={H.icon} color={C.navy} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.route}>Reparto {order.routeCode}</Text>
          <Text style={styles.meta}>
            {totalItems} producto{totalItems !== 1 ? 's' : ''} · {formatTime(order.createdAt)}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: status.soft }]}>
          <Ionicons name={status.icon} size={16} color={status.text} />
          <Text style={[styles.chipText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>

      {order.observations ? <Text style={styles.observations}>{order.observations}</Text> : null}

      {showStepper && <OrderStatusStepper status={order.status} />}
    </Pressable>
  );
}

const ICON_BOX = 52;

const styles = StyleSheet.create({
  card: { gap: S.lg, padding: S.md + 2, borderRadius: R.card, backgroundColor: C.white },
  pressed: { opacity: 0.85 },
  top: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  icon: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: R.md + 4,
    backgroundColor: C.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
  route: { ...T.section, color: C.navy },
  meta: { ...T.secondary, fontFamily: T.body.fontFamily, color: C.ink2, fontVariant: ['tabular-nums'] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs + 2,
    height: 36,
    paddingHorizontal: S.md,
    borderRadius: R.full,
  },
  chipText: { ...T.label },
  observations: { ...T.body, color: C.ink2, fontStyle: 'italic' },
});

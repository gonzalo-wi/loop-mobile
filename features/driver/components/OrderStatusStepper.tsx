import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { OrderStatus } from '../types';
import { C, R, S, T } from '@/lib/theme';

/** Label, icon and colors of each order status (pending = orange, in progress = blue, done = green). */
export const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; soft: string; text: string }
> = {
  PENDING: { label: 'Pendiente', icon: 'hourglass-outline', color: C.orange, soft: C.orangeSoft, text: C.navy },
  IN_PROGRESS: { label: 'En preparación', icon: 'cube-outline', color: C.blue, soft: C.blueLight, text: C.blueText },
  COMPLETED: { label: 'Completado', icon: 'checkmark-done', color: C.greenDot, soft: C.greenSoft, text: C.navy },
};

const STEPS: OrderStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

/**
 * Order progress as a three-part bar: PENDING → IN_PROGRESS → COMPLETED.
 * Reached parts take the current status color; the current label is bold.
 */
export function OrderStatusStepper({ status }: { status: OrderStatus }) {
  const currentIndex = Math.max(0, STEPS.indexOf(status));
  const current = ORDER_STATUS[STEPS[currentIndex]];

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`Estado del pedido: ${current.label}`}
    >
      <View style={styles.bars}>
        {STEPS.map((step, i) => (
          <View key={step} style={[styles.bar, i <= currentIndex && { backgroundColor: current.color }]} />
        ))}
      </View>
      <View style={styles.labels}>
        {STEPS.map((step, i) => (
          <Text
            key={step}
            style={[
              styles.label,
              i === 0 && styles.labelStart,
              i === STEPS.length - 1 && styles.labelEnd,
              i === currentIndex && styles.labelCurrent,
            ]}
          >
            {ORDER_STATUS[step].label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: S.sm },
  bars: { flexDirection: 'row', gap: S.xs + 1 },
  bar: { flex: 1, height: 6, borderRadius: R.full, backgroundColor: C.line },
  labels: { flexDirection: 'row' },
  label: { ...T.secondary, fontFamily: T.body.fontFamily, color: C.ink2, flex: 1, textAlign: 'center' },
  labelStart: { textAlign: 'left' },
  labelEnd: { textAlign: 'right' },
  labelCurrent: { fontFamily: T.button.fontFamily, color: C.navy },
});

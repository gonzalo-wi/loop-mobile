import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusCell } from '@/components/ui';
import { C, R, S, T, FIT_ONE_LINE } from '@/lib/theme';
import { getExcludedSerials } from '../lib/movementOutcome';
import { getMovementStatusCells } from '../lib/movementStatusCells';
import type { DispenserMovement } from '../types';
import { formatClockTime } from '@/lib/dateFormat';

type MovementCardProps = {
  mov: DispenserMovement;
  onPress: () => void;
};

/** A movement of the day: route, count, who and when, and its status in each system. */
export function MovementCard({ mov, onPress }: MovementCardProps) {
  const isLoad = mov.type === 'LOAD';
  const count = mov.serials.length;
  const excludedCount = getExcludedSerials(mov).length;
  const excludedLabel = isLoad
    ? `${excludedCount} no disponible${excludedCount !== 1 ? 's' : ''} en Odoo`
    : `${excludedCount} no normalizado${excludedCount !== 1 ? 's' : ''} → Odoo`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Reparto ${mov.routeCode}, ${count} dispenser${count !== 1 ? 's' : ''}`}
      style={({ pressed }) => [
        styles.card,
        mov.status === 'CANCELLED' && styles.cancelled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.top}>
        <View style={styles.route}>
          <Text style={styles.routeText} {...FIT_ONE_LINE}>R{mov.routeCode}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.count} {...FIT_ONE_LINE}>
            {count} dispenser{count !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.meta}>
            {mov.technician} · {formatClockTime(mov.createdAt)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={C.ink2} />
      </View>

      {excludedCount > 0 && (
        <View style={styles.excluded}>
          <Ionicons name="alert-circle-outline" size={16} color={C.orangeText} />
          <Text style={styles.excludedText}>{excludedLabel}</Text>
        </View>
      )}

      <View style={styles.cells}>
        {getMovementStatusCells(mov).map((cell) => (
          <StatusCell key={cell.system} system={cell.system} status={cell.status} tone={cell.tone} />
        ))}
      </View>
    </Pressable>
  );
}

const ROUTE_BADGE = 52;

const styles = StyleSheet.create({
  card: {
    gap: S.md,
    padding: S.md + 2,
    borderRadius: R.card,
    backgroundColor: C.white,
  },
  cancelled: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
  top: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  route: {
    minWidth: ROUTE_BADGE,
    height: ROUTE_BADGE,
    paddingHorizontal: S.sm,
    borderRadius: R.md + 4,
    backgroundColor: C.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeText: { ...T.data, color: C.navy, fontVariant: ['tabular-nums'] },
  info: { flex: 1 },
  count: { ...T.section, color: C.navy },
  meta: { ...T.secondary, fontFamily: T.body.fontFamily, fontSize: T.body.fontSize, color: C.ink2, fontVariant: ['tabular-nums'] },
  excluded: { flexDirection: 'row', alignItems: 'center', gap: S.xs + 2 },
  excludedText: { ...T.secondary, fontFamily: T.label.fontFamily, color: C.orangeText, flexShrink: 1 },
  cells: { flexDirection: 'row', gap: S.sm },
});

import { StyleSheet, Text, View } from 'react-native';
import { C, H, R, S, T } from '@/lib/theme';

export type StatusTone = 'ok' | 'pending' | 'error';

const TONE: Record<StatusTone, { bg: string; dot: string }> = {
  ok: { bg: C.greenSoft, dot: C.greenDot },
  pending: { bg: C.orangeSoft, dot: C.orange },
  error: { bg: C.redSoft, dot: C.red },
};

type StatusCellProps = {
  system: string;
  status: string;
  tone: StatusTone;
};

/** Per-system status (Aguas / Odoo): the color never goes alone, the text says it too. */
export function StatusCell({ system, status, tone }: StatusCellProps) {
  const t = TONE[tone];
  return (
    <View style={[styles.cell, { backgroundColor: t.bg }]}>
      <View style={[styles.dot, { backgroundColor: t.dot }]} />
      <Text style={styles.system}>{system}</Text>
      <Text style={[styles.status, tone === 'error' && styles.statusError]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    minHeight: H.statusCell,
    paddingHorizontal: S.md,
    borderRadius: R.cell,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  system: {
    ...T.secondary,
    fontFamily: T.label.fontFamily,
    color: C.navy,
  },
  status: {
    ...T.secondary,
    color: C.ink2,
    flexShrink: 1,
  },
  statusError: {
    color: C.redText,
  },
});

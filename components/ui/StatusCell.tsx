import { StyleSheet, Text, View } from 'react-native';
import { C, H, R, S, T, FIT_ONE_LINE } from '@/lib/theme';

export type StatusTone = 'ok' | 'pending' | 'error' | 'neutral';

const TONE: Record<StatusTone, { bg: string; dot: string }> = {
  ok: { bg: C.greenSoft, dot: C.greenDot },
  pending: { bg: C.orangeSoft, dot: C.orange },
  error: { bg: C.redSoft, dot: C.red },
  neutral: { bg: C.cream, dot: C.ink2 },
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
      {/* One line each: with a large system font they shrink instead of breaking mid-word. */}
      <Text style={styles.system} {...FIT_ONE_LINE}>{system}</Text>
      <Text style={[styles.status, tone === 'error' && styles.statusError]} {...FIT_ONE_LINE}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
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
    color: C.ink2,
    flexShrink: 1,
  },
  status: {
    ...T.secondary,
    fontFamily: T.button.fontFamily,
    color: C.navy,
    flexShrink: 1,
    marginLeft: 'auto',
  },
  statusError: {
    color: C.redText,
  },
});

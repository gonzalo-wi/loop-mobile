import { StyleSheet, Text, View } from 'react-native';
import { C, R, S, T } from '@/lib/theme';
import { getControlStatus, type ControlStatusTone } from '../lib/controlStatus';

const TONE: Record<ControlStatusTone, { bg: string; fg: string }> = {
  info: { bg: C.blueLight, fg: C.blueText },
  pending: { bg: C.orangeSoft, fg: C.orangeText },
  ok: { bg: C.greenSoft, fg: C.navy },
  error: { bg: C.redSoft, fg: C.redText },
  neutral: { bg: C.cream, fg: C.ink2 },
};

/** Status of a stock control as a small soft-colored pill. */
export function ControlStatusChip({ status }: { status: string }) {
  const { label, tone } = getControlStatus(status);
  const t = TONE[tone];
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    height: 28,
    paddingHorizontal: S.md - 2,
    borderRadius: R.full,
    justifyContent: 'center',
  },
  text: { ...T.secondary, fontFamily: T.label.fontFamily },
});

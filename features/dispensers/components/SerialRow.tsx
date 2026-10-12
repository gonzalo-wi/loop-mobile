import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, H, R, S, T } from '@/lib/theme';
import type { SerialRowStatus, SerialRowTone } from '../lib/serialRowStatus';
import { BaggedToggle } from './BaggedToggle';

const TONE: Record<SerialRowTone, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap; text: string }> = {
  ok: { bg: C.green, fg: C.navy, icon: 'checkmark', text: C.ink2 },
  warning: { bg: C.orange, fg: C.navy, icon: 'alert', text: C.orangeText },
  error: { bg: C.red, fg: C.white, icon: 'close', text: C.redText },
};

const STATUS_DOT = 32;

type SerialRowProps = {
  code: string;
  status: SerialRowStatus;
  onRemove: () => void;
  /** Only on UNLOAD: the "Embolsado" mark. */
  bagged?: { value: boolean; onToggle: () => void };
};

/** A scanned dispenser: status circle, serial, status lines (never truncated) and remove. */
export function SerialRow({ code, status, onRemove, bagged }: SerialRowProps) {
  const t = TONE[status.tone];
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: t.bg }]}>
        <Ionicons name={t.icon} size={18} color={t.fg} />
      </View>
      <View style={styles.body}>
        <Text style={styles.serial}>{code}</Text>
        {status.message ? (
          <Text style={[styles.message, { color: t.text }]}>{status.message}</Text>
        ) : null}
        {status.detail ? <Text style={styles.detail}>{status.detail}</Text> : null}
      </View>
      {bagged ? <BaggedToggle code={code} bagged={bagged.value} onPress={bagged.onToggle} /> : null}
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={`Quitar ${code}`}
        style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}
      >
        <Ionicons name="close" size={20} color={C.ink2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    minHeight: 60,
    paddingVertical: S.sm + 2,
    paddingLeft: S.md + 2,
    paddingRight: S.sm,
    borderRadius: R.row,
    backgroundColor: C.white,
  },
  dot: {
    width: STATUS_DOT,
    height: STATUS_DOT,
    borderRadius: STATUS_DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  serial: {
    ...T.data,
    color: C.navy,
    fontVariant: ['tabular-nums'],
  },
  message: {
    ...T.secondary,
    fontFamily: T.label.fontFamily,
  },
  detail: {
    ...T.secondary,
    fontSize: 12,
    lineHeight: 16,
    color: C.ink2,
  },
  remove: {
    width: H.touch,
    height: H.touch,
    borderRadius: H.touch / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePressed: {
    backgroundColor: C.cream,
  },
});

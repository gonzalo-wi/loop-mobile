import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, H, S, T } from '@/lib/theme';

export type PillTone = 'white' | 'onBlue' | 'onGreen' | 'blue' | 'green' | 'destructive';

type PillProps = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Without onPress it renders as a static badge (e.g. the direction pill). */
  onPress?: () => void;
  /** 'white' on cream · 'onBlue'/'onGreen' darkened inside a color block · 'blue'/'green' direction pills. */
  tone?: PillTone;
  accessibilityLabel?: string;
};

const TONE: Record<PillTone, { bg: string; fg: string }> = {
  white: { bg: C.white, fg: C.navy },
  onBlue: { bg: C.pillOnBlue, fg: C.white },
  onGreen: { bg: C.pillOnGreen, fg: C.navy },
  blue: { bg: C.blue, fg: C.white },
  green: { bg: C.green, fg: C.navy },
  destructive: { bg: C.redSoft, fg: C.redText },
};

export function Pill({ label, icon, onPress, tone = 'white', accessibilityLabel }: PillProps) {
  const t = TONE[tone];
  const content = (
    <View style={styles.content}>
      {icon ? <Ionicons name={icon} size={H.iconInPill - 2} color={t.fg} /> : null}
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );

  if (!onPress) {
    return (
      <View style={[styles.base, { backgroundColor: t.bg }]} accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.base, { backgroundColor: t.bg }, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: H.pill,
    borderRadius: H.pill / 2,
    paddingLeft: S.md,
    paddingRight: S.lg,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  content: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm - 2,
  },
  text: {
    ...T.label,
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.8,
  },
});

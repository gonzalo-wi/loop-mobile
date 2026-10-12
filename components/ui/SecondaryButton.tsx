import { Pressable, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, H, S, T } from '@/lib/theme';

type SecondaryButtonProps = {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /**
   * 'cream' on white surfaces · 'outline' (2pt navy border) on green blocks ·
   * 'destructive' for cancel/delete, always narrower than the primary next to it.
   */
  tone?: 'cream' | 'outline' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
};

const TONE = {
  cream: { bg: C.cream, fg: C.navy, border: 'transparent' },
  outline: { bg: 'transparent', fg: C.navy, border: C.navy },
  destructive: { bg: C.redSoft, fg: C.redText, border: 'transparent' },
} as const;

export function SecondaryButton({
  title,
  onPress,
  icon,
  tone = 'cream',
  loading = false,
  disabled = false,
}: SecondaryButtonProps) {
  const t = TONE[tone];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: t.bg, borderColor: t.border },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={t.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={H.iconInPill} color={t.fg} /> : null}
          <Text style={[styles.text, { color: t.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: H.secondaryButton,
    borderRadius: H.secondaryButton / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S.xl,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.45,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  text: {
    ...T.label,
    fontSize: T.body.fontSize,
  },
});

import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, H, S, T, Shdw } from '@/lib/theme';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  /** 'end' for forward arrows ("Ingresar →"). */
  iconPosition?: 'start' | 'end';
  /** 'solid' (navy, the one main action) | 'soft' (cream) | 'ghost' (no background). */
  variant?: 'solid' | 'soft' | 'ghost';
};

/**
 * Main action button: navy pill, 60 tall, at most one per screen.
 * Loading/disabled states and a light press-in feedback with Pressable only.
 */
export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'start',
  variant = 'solid',
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const isSolid = variant === 'solid';
  const contentColor = isSolid ? C.white : C.navy;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        variant === 'solid' && styles.solid,
        variant === 'soft' && styles.soft,
        variant === 'ghost' && styles.ghost,
        isSolid && !isDisabled && Shdw.primaryButton,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'start' ? (
            <Ionicons name={icon} size={H.iconInPill + 2} color={contentColor} />
          ) : null}
          <Text style={[styles.text, { color: contentColor }]}>{title}</Text>
          {icon && iconPosition === 'end' ? (
            <Ionicons name={icon} size={H.iconInPill + 2} color={contentColor} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: H.primaryButton,
    borderRadius: H.primaryButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S.xl,
  },
  solid: {
    backgroundColor: C.navy,
  },
  soft: {
    backgroundColor: C.cream,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.45,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm + 2,
  },
  text: {
    ...T.button,
  },
});

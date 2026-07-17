import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S, F, W, Shdw } from '@/lib/theme';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  /** 'solid' (relleno de marca) | 'soft' (suave) | 'ghost' (sin fondo). */
  variant?: 'solid' | 'soft' | 'ghost';
};

/**
 * Botón principal del sistema. Estados loading/disabled y microinteracción
 * táctil (leve hundido al presionar) usando Pressable — sin librerías de
 * animación, performante en gama baja.
 */
export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  variant = 'solid',
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const isSolid = variant === 'solid';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'solid' && styles.solid,
        variant === 'soft' && styles.soft,
        variant === 'ghost' && styles.ghost,
        isSolid && !isDisabled && Shdw.float,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSolid ? '#fff' : C.primary} />
      ) : (
        <View style={styles.content}>
          <Text style={[styles.text, !isSolid && styles.textAlt]}>{title}</Text>
          {icon ? (
            <Ionicons name={icon} size={19} color={isSolid ? '#fff' : C.primary} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 58,
    borderRadius: R.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S.lg,
  },
  solid: {
    backgroundColor: C.primary,
  },
  soft: {
    backgroundColor: C.primaryLight,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  disabled: {
    backgroundColor: C.borderStrong,
    opacity: 0.7,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  text: {
    color: '#fff',
    fontSize: F.lg - 1,
    fontWeight: W.extra,
    letterSpacing: 0.2,
  },
  textAlt: {
    color: C.primary,
  },
});

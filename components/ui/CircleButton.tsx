import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, H, Shdw } from '@/lib/theme';

type CircleButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Icon-only control: the label is what screen readers announce. */
  accessibilityLabel: string;
  /** 'large' (60, floating, with shadow) is used in the bottom bar. */
  size?: 'regular' | 'large';
  disabled?: boolean;
};

export function CircleButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 'regular',
  disabled = false,
}: CircleButtonProps) {
  const dimension = size === 'large' ? H.circleButtonLarge : H.circleButton;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
        size === 'large' && Shdw.floatingWhite,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name={icon} size={H.icon} color={C.navy} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.45,
  },
});

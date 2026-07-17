import { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { C } from '@/lib/theme';

type ScreenBackgroundProps = {
  children: ReactNode;
  /** Muestra las formas decorativas superiores (profundidad). Default: true. */
  decorated?: boolean;
  style?: ViewStyle;
};

/**
 * Fondo base de pantalla con profundidad sutil. En vez de un blanco vacío,
 * agrega dos "glows" de marca difuminados en la parte superior — estética
 * SaaS/logística moderna. Las formas son estáticas (sin animación) y livianas.
 */
export function ScreenBackground({ children, decorated = true, style }: ScreenBackgroundProps) {
  return (
    <View style={[styles.root, style]}>
      {decorated && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={styles.glowPrimary} />
          <View style={styles.glowAccent} />
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  glowPrimary: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: C.primaryLight,
    opacity: 0.9,
  },
  glowAccent: {
    position: 'absolute',
    top: 40,
    left: -100,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: C.accentLight,
    opacity: 0.55,
  },
});

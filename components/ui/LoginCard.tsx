import { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, R, S, F, W, Shdw } from '@/lib/theme';

type LoginCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/**
 * Tarjeta contenedora de formularios (login y futuras pantallas de acceso).
 * Borde sutil + sombra flotante realista + buen espaciado interno.
 */
export function LoginCard({ title, subtitle, children }: LoginCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: S.xl + 2,
    borderWidth: 1,
    borderColor: C.border,
    ...Shdw.float,
  },
  title: {
    fontSize: F.xl,
    fontWeight: W.extra,
    color: C.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: F.sm + 1,
    fontWeight: W.medium,
    color: C.textMuted,
    marginTop: S.xs,
  },
  body: {
    marginTop: S.lg,
    gap: S.md,
  },
});

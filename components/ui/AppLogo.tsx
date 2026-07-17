import { View, Text, Image, StyleSheet } from 'react-native';
import { C, S, F, W } from '@/lib/theme';

const logoImage = require('@/assets/images/logoLoop.png');

const SIZES = {
  md: { logo: 72 },
  lg: { logo: 128 },
};

type AppLogoProps = {
  showText?: boolean;
  size?: 'md' | 'lg';
  tagline?: string;
  /** Usar sobre fondos oscuros: tagline en blanco semitransparente */
  onDark?: boolean;
};

export function AppLogo({
  showText = true,
  size = 'lg',
  tagline = 'Gestión de repartos y depósito',
  onDark = false,
}: AppLogoProps) {
  const s = SIZES[size];

  return (
    <View style={styles.container}>
      <Image
        source={logoImage}
        style={{ width: s.logo, height: s.logo }}
        resizeMode="contain"
      />
      {showText && (
        <Text style={[styles.tagline, onDark && styles.taglineDark]}>{tagline}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: F.sm,
    fontWeight: W.medium,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: S.xs + 2,
  },
  taglineDark: {
    color: 'rgba(255,255,255,0.60)',
    fontWeight: W.semibold,
    letterSpacing: 0.2,
  },
});

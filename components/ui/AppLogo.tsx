import { View, Text, Image, StyleSheet } from 'react-native';
import { C, S, T } from '@/lib/theme';

const logoImage = require('@/assets/images/logoLoop.png');

const SIZES = {
  md: { width: 72, height: 64 },
  lg: { width: 148, height: 130 },
};

type AppLogoProps = {
  /** Shows the "LOOP" wordmark and the tagline under the logo. */
  showText?: boolean;
  size?: 'md' | 'lg';
  tagline?: string;
};

/** Logo for the navy login hero: image, "LOOP" wordmark and tagline. */
export function AppLogo({
  showText = true,
  size = 'lg',
  tagline = 'Control operativo de repartos',
}: AppLogoProps) {
  const s = SIZES[size];

  return (
    <View style={styles.container}>
      <Image
        source={logoImage}
        style={{ width: s.width, height: s.height }}
        resizeMode="contain"
        accessibilityLabel="Ivess"
      />
      {showText ? (
        <>
          <Text style={styles.wordmark}>LOOP</Text>
          <Text style={styles.tagline}>{tagline}</Text>
        </>
      ) : null}
    </View>
  );
}

/** Logo inside a navy circle, for headers on light backgrounds. */
export function AppLogoBadge() {
  return (
    <View style={styles.badge}>
      <Image source={logoImage} style={styles.badgeImage} resizeMode="contain" accessibilityLabel="Ivess" />
    </View>
  );
}

const WORDMARK_TRACKING = 3.6;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: S.xs + 2,
  },
  wordmark: {
    ...T.blockTitle,
    letterSpacing: WORDMARK_TRACKING,
    // Balances the trailing tracking so the word stays optically centered.
    paddingLeft: WORDMARK_TRACKING,
    color: C.white,
    marginTop: S.sm + 2,
  },
  tagline: {
    ...T.body,
    color: C.onNavyMuted,
    textAlign: 'center',
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeImage: {
    width: 40,
    height: 35,
  },
});

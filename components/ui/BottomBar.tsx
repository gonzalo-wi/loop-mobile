import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, S } from '@/lib/theme';

type BottomBarProps = {
  children: ReactNode;
  /** Extra space for a floating tab bar underneath, if the screen has one. */
  extraBottom?: number;
  /** Inside a tab screen the scene already clears the tab bar and the safe area. */
  aboveTabBar?: boolean;
};

/** Height of the cream fade above the bar, so scrolled content dissolves instead of being cut. */
const FADE_HEIGHT = S.xxl;

/**
 * Bar pinned to the bottom with the screen's main action. A cream gradient
 * above it keeps scrolled content from showing between the buttons.
 */
export function BottomBar({ children, extraBottom = 0, aboveTabBar = false }: BottomBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: S.md + (aboveTabBar ? 0 : insets.bottom) + extraBottom }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[C.creamClear, C.cream]}
        style={styles.fade}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingTop: S.md,
    paddingHorizontal: S.gutter,
    backgroundColor: C.cream,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -FADE_HEIGHT,
    height: FADE_HEIGHT,
  },
});

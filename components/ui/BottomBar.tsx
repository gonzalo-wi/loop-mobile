import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, S } from '@/lib/theme';

type BottomBarProps = {
  children: ReactNode;
  /** Extra space for a floating tab bar underneath, if the screen has one. */
  extraBottom?: number;
};

/**
 * Bar pinned to the bottom with the screen's main action. The spec asks for a
 * cream gradient behind it; without a gradient dependency it uses solid cream,
 * which also keeps scrolled content from showing between the buttons.
 */
export function BottomBar({ children, extraBottom = 0 }: BottomBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: S.md + insets.bottom + extraBottom }]}>
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
});

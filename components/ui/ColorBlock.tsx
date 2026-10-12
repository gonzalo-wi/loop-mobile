import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { C, R, S } from '@/lib/theme';

export type BlockTone = 'blue' | 'green' | 'navy' | 'orange' | 'red';

/** Background plus the text colors that pass contrast on it. */
export const BLOCK_TONE: Record<BlockTone, { bg: string; fg: string; fgSub: string }> = {
  blue: { bg: C.blue, fg: C.white, fgSub: C.blueLight },
  green: { bg: C.green, fg: C.navy, fgSub: C.ink2OnGreen },
  navy: { bg: C.navy, fg: C.white, fgSub: C.blueLight },
  orange: { bg: C.orange, fg: C.navy, fgSub: C.navy },
  red: { bg: C.red, fg: C.white, fgSub: C.white },
};

type ColorBlockProps = {
  tone: BlockTone;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Solid color block (radius 32) that groups a movement's data or a system status. */
export function ColorBlock({ tone, children, style }: ColorBlockProps) {
  return (
    <View style={[styles.block, { backgroundColor: BLOCK_TONE[tone].bg }, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: R.block,
    padding: S.lg,
    gap: S.md,
  },
});

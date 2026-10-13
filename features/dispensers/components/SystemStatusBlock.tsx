import { StyleSheet, Text, View } from 'react-native';
import { BLOCK_TONE, ColorBlock, SystemTag, type BlockTone } from '@/components/ui';
import { S, T, FIT_ONE_LINE } from '@/lib/theme';
import type { StatusCellTone } from '../lib/movementStatusCells';
import type { SystemStatusBlock as Block } from '../lib/systemStatusBlocks';

const TONE_TO_BLOCK: Record<StatusCellTone, BlockTone> = {
  ok: 'green',
  pending: 'orange',
  error: 'red',
  neutral: 'neutral',
};

/** One system's status as a color block: tag, big status word and its detail (never truncated). */
export function SystemStatusBlock({ block }: { block: Block }) {
  const tone = TONE_TO_BLOCK[block.tone];
  const colors = BLOCK_TONE[tone];
  return (
    <ColorBlock tone={tone} style={styles.block}>
      <SystemTag system={block.system} label={block.tag} />
      <View style={styles.texts}>
        <Text style={[styles.title, { color: colors.fg }]} {...FIT_ONE_LINE}>
          {block.title}
        </Text>
        {block.detail ? <Text style={[styles.detail, { color: colors.fgSub }]}>{block.detail}</Text> : null}
      </View>
    </ColorBlock>
  );
}

const styles = StyleSheet.create({
  block: {
    flex: 1,
    minHeight: 132,
    gap: S.lg,
    padding: S.lg,
  },
  texts: { gap: 2 },
  title: { ...T.blockTitle, fontSize: 28, lineHeight: 34 },
  detail: { ...T.label, fontFamily: T.secondary.fontFamily, fontSize: T.body.fontSize },
});

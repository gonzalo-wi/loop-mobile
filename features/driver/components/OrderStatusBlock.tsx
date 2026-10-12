import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BLOCK_TONE, ColorBlock, type BlockTone } from '@/components/ui';
import { C, S, T } from '@/lib/theme';
import type { OrderStatus } from '../types';
import { ORDER_STATUS } from './OrderStatusStepper';

const BLOCK: Record<OrderStatus, { tone: BlockTone; title: string }> = {
  PENDING: { tone: 'orange', title: 'Pendiente de preparación' },
  IN_PROGRESS: { tone: 'blue', title: 'En preparación' },
  COMPLETED: { tone: 'green', title: 'Completado' },
};

const STEPS: OrderStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
const STEP = 44;

/**
 * The order's state in one color block: tag, status, "Entregado al
 * repartidor" once completed, and the stages as circles (done ones checked).
 */
export function OrderStatusBlock({ status }: { status: OrderStatus }) {
  const block = BLOCK[status] ?? BLOCK.PENDING;
  const colors = BLOCK_TONE[block.tone];
  const currentIndex = Math.max(0, STEPS.indexOf(status));
  const isCompleted = status === 'COMPLETED';
  const onBlue = block.tone === 'blue';
  // Navy reads on orange and green; on blue the marks are white.
  const mark = onBlue ? C.white : C.navy;

  return (
    <ColorBlock tone={block.tone} style={styles.block}>
      <View style={[styles.tag, onBlue && styles.tagOnBlue]}>
        <Ionicons name="cart-outline" size={14} color={onBlue ? C.navy : C.white} />
        <Text style={[styles.tagText, onBlue && styles.tagTextOnBlue]}>PEDIDO</Text>
      </View>

      <View style={styles.texts}>
        <Text style={[styles.title, { color: colors.fg }]} accessibilityRole="header">
          {block.title}
        </Text>
        {isCompleted ? (
          <Text style={[styles.subtitle, { color: colors.fgSub }]}>Entregado al repartidor</Text>
        ) : null}
      </View>

      <View style={styles.steps} accessibilityLabel={`Etapa: ${ORDER_STATUS[STEPS[currentIndex]].label}`}>
        {STEPS.map((step, i) => {
          const done = i < currentIndex || isCompleted;
          const current = i === currentIndex && !isCompleted;
          return (
            <View key={step} style={styles.step}>
              <View style={styles.circleRow}>
                <View style={[styles.line, i === 0 && styles.lineHidden, { backgroundColor: mark }, i > currentIndex && styles.lineFaded]} />
                <View
                  style={[
                    styles.circle,
                    { borderColor: mark },
                    (done || current) && { backgroundColor: mark },
                    current && styles.circleCurrent,
                  ]}
                >
                  <Ionicons
                    name={done ? 'checkmark' : ORDER_STATUS[step].icon}
                    size={18}
                    color={done || current ? colors.bg : mark}
                  />
                </View>
                <View
                  style={[
                    styles.line,
                    i === STEPS.length - 1 && styles.lineHidden,
                    { backgroundColor: mark },
                    i >= currentIndex && !isCompleted && styles.lineFaded,
                  ]}
                />
              </View>
              <Text style={[styles.stepLabel, { color: colors.fg }, (current || done) && styles.stepLabelStrong]}>
                {ORDER_STATUS[step].label}
              </Text>
            </View>
          );
        })}
      </View>
    </ColorBlock>
  );
}

const styles = StyleSheet.create({
  block: { gap: S.lg, padding: S.xl },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: S.xs + 2,
    height: 30,
    paddingHorizontal: S.md,
    borderRadius: 15,
    backgroundColor: C.navy,
  },
  tagOnBlue: { backgroundColor: C.white },
  tagText: { ...T.systemTag, fontSize: 12, color: C.white },
  tagTextOnBlue: { color: C.navy },
  texts: { gap: S.xs },
  title: { ...T.blockTitle },
  subtitle: { ...T.label, fontFamily: T.secondary.fontFamily, fontSize: T.section.fontSize, lineHeight: 24 },
  steps: { flexDirection: 'row' },
  step: { flex: 1, alignItems: 'center', gap: S.sm },
  circleRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  line: { flex: 1, height: 3 },
  lineHidden: { opacity: 0 },
  lineFaded: { opacity: 0.35 },
  circle: {
    width: STEP,
    height: STEP,
    borderRadius: STEP / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCurrent: { borderWidth: 4, borderColor: C.white },
  stepLabel: { ...T.secondary, fontFamily: T.body.fontFamily, textAlign: 'center' },
  stepLabelStrong: { fontFamily: T.label.fontFamily },
});

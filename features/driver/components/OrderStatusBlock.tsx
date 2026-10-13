import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BLOCK_TONE, ColorBlock, type BlockTone } from '@/components/ui';
import { C, S, T } from '@/lib/theme';
import { useReduceMotion } from '@/lib/useReduceMotion';
import type { OrderStatus } from '../types';
import { getOrderSteps, type OrderStep } from '../lib/orderSteps';
import { ORDER_STATUS } from './OrderStatusStepper';

const BLOCK: Record<OrderStatus, { tone: BlockTone; title: string }> = {
  PENDING: { tone: 'orange', title: 'Pendiente de preparación' },
  IN_PROGRESS: { tone: 'blue', title: 'En preparación' },
  COMPLETED: { tone: 'green', title: 'Completado' },
};

const STEP = 44;
/** Delay between one stage appearing and the next, so the progress reads left to right. */
const STAGGER_MS = 160;
const LINE_MS = 280;
const PULSE_MS = 1400;
const ICON_MOVE_MS = 600;
const ICON_REST_MS = 900;
/** How far the box icon hops while the order is being prepared. */
const ICON_HOP = -4;
const HALO_MAX_SCALE = 1.7;
const HALO_START_OPACITY = 0.7;
const TRACK_OPACITY = 0.35;

/**
 * The order's state in one color block: tag, status, "Entregado al
 * repartidor" once completed, and the stages as circles (done ones checked).
 * On open the stages build up left to right and the current one keeps pulsing.
 */
export function OrderStatusBlock({ status }: { status: OrderStatus }) {
  const block = BLOCK[status] ?? BLOCK.PENDING;
  const colors = BLOCK_TONE[block.tone];
  const steps = getOrderSteps(status);
  const current = steps.find((s) => s.state === 'current') ?? steps[steps.length - 1];
  const onBlue = block.tone === 'blue';
  // Navy reads on orange and green; on blue the marks are white.
  const mark = onBlue ? C.white : C.navy;
  const reduceMotion = useReduceMotion();

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
        {status === 'COMPLETED' ? (
          <Text style={[styles.subtitle, { color: colors.fgSub }]}>Entregado al repartidor</Text>
        ) : null}
      </View>

      <View style={styles.steps} accessibilityLabel={`Etapa: ${ORDER_STATUS[current.status].label}`}>
        {steps.map((step, i) => (
          <StepView
            // Remount on status change so the build-up plays again for the new stage.
            key={`${status}-${step.status}`}
            step={step}
            index={i}
            isFirst={i === 0}
            isLast={i === steps.length - 1}
            lineBeforeFilled={i > 0 && steps[i - 1].lineAfterFilled}
            mark={mark}
            fill={colors.bg}
            labelColor={colors.fg}
            reduceMotion={reduceMotion}
          />
        ))}
      </View>
    </ColorBlock>
  );
}

type StepViewProps = {
  step: OrderStep;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  lineBeforeFilled: boolean;
  mark: string;
  fill: string;
  labelColor: string;
  reduceMotion: boolean;
};

function StepView({
  step, index, isFirst, isLast, lineBeforeFilled, mark, fill, labelColor, reduceMotion,
}: StepViewProps) {
  const done = step.state === 'done';
  const current = step.state === 'current';
  const startAt = reduceMotion ? 1 : 0;

  const appear = useRef(new Animated.Value(startAt)).current;
  const lineIn = useRef(new Animated.Value(startAt)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const iconMove = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      // The setting resolves after the first render: show the final state, not a half-played intro.
      appear.setValue(1);
      lineIn.setValue(1);
      pulse.setValue(0);
      iconMove.setValue(0);
      return;
    }

    const delay = index * STAGGER_MS;
    const intro = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(appear, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
        Animated.timing(lineIn, {
          toValue: 1,
          duration: LINE_MS,
          delay: STAGGER_MS / 2,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);

    const loops: Animated.CompositeAnimation[] = [];
    if (current) {
      loops.push(
        Animated.loop(
          Animated.timing(pulse, { toValue: 1, duration: PULSE_MS, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ),
        // Hourglass flips, the box hops: each icon moves the way its stage feels.
        Animated.loop(
          Animated.sequence([
            Animated.timing(iconMove, { toValue: 1, duration: ICON_MOVE_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
            Animated.delay(ICON_REST_MS),
            Animated.timing(iconMove, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ),
      );
    }

    intro.start(({ finished }) => {
      if (finished) loops.forEach((l) => l.start());
    });
    return () => {
      intro.stop();
      loops.forEach((l) => l.stop());
    };
  }, [reduceMotion, current, index, appear, lineIn, pulse, iconMove]);

  const iconTransform =
    step.status === 'PENDING'
      ? [{ rotate: iconMove.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }]
      : [{ translateY: iconMove.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, ICON_HOP, 0] }) }];

  return (
    <View style={styles.step}>
      <View style={styles.circleRow}>
        <Connector hidden={isFirst} filled={lineBeforeFilled} progress={lineIn} color={mark} />

        <View style={styles.circleWrap}>
          {current && !reduceMotion ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.halo,
                { borderColor: mark },
                {
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [HALO_START_OPACITY, 0] }),
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, HALO_MAX_SCALE] }) }],
                },
              ]}
            />
          ) : null}
          <Animated.View
            style={[
              styles.circle,
              { borderColor: mark },
              (done || current) && { backgroundColor: mark },
              current && styles.circleCurrent,
              {
                opacity: appear,
                transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
              },
            ]}
          >
            <Animated.View style={current ? { transform: iconTransform } : null}>
              <Ionicons
                name={done ? 'checkmark' : ORDER_STATUS[step.status].icon}
                size={18}
                color={done || current ? fill : mark}
              />
            </Animated.View>
          </Animated.View>
        </View>

        <Connector hidden={isLast} filled={step.lineAfterFilled} progress={lineIn} color={mark} />
      </View>
      <Text
        style={[styles.stepLabel, { color: labelColor }, (current || done) && styles.stepLabelStrong]}
        numberOfLines={2}
      >
        {ORDER_STATUS[step.status].label}
      </Text>
    </View>
  );
}

/** Half of the line between two stages: a faded track, drawn solid (growing left to right) once reached. */
function Connector({
  hidden, filled, progress, color,
}: { hidden: boolean; filled: boolean; progress: Animated.Value; color: string }) {
  return (
    <View style={[styles.line, hidden && styles.lineHidden]}>
      <View style={[StyleSheet.absoluteFill, styles.lineTrack, { backgroundColor: color }]} />
      {filled ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.lineFill,
            { backgroundColor: color, transform: [{ scaleX: progress }] },
          ]}
        />
      ) : null}
    </View>
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
  lineTrack: { opacity: TRACK_OPACITY },
  lineFill: { transformOrigin: 'left' },
  circleWrap: { width: STEP, height: STEP, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: STEP,
    height: STEP,
    borderRadius: STEP / 2,
    borderWidth: 3,
  },
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

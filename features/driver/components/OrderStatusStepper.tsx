import { Fragment, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { OrderStatus } from '../types';
import { C, R, F, W } from '@/lib/theme';

type Step = {
  key: OrderStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const STEPS: Step[] = [
  { key: 'PENDING', label: 'Pendiente', icon: 'hourglass-outline' },
  { key: 'IN_PROGRESS', label: 'En preparación', icon: 'cube' },
  { key: 'COMPLETED', label: 'Completado', icon: 'checkmark-done' },
];

const CIRCLE = 30;

/**
 * Círculo de un paso. Cuando es el paso activo "respira": un halo late detrás
 * y el círculo pulsa suavemente, para que el repartidor sienta que el pedido
 * está vivo / en movimiento mientras espera. Animaciones nativas (transform +
 * opacity) → fluidas en gama baja. Solo corren en el paso activo.
 */
function StepCircle({
  active,
  done,
  icon,
}: {
  active: boolean;
  done: boolean;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const halo = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    const haloLoop = Animated.loop(
      Animated.timing(halo, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    halo.setValue(0);
    breathe.setValue(0);
    haloLoop.start();
    breatheLoop.start();

    return () => {
      haloLoop.stop();
      breatheLoop.stop();
    };
  }, [active, halo, breathe]);

  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] });
  const haloOpacity = halo.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const circleScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <View style={styles.circleWrap}>
      {active && (
        <Animated.View
          style={[
            styles.halo,
            { opacity: haloOpacity, transform: [{ scale: haloScale }] },
          ]}
        />
      )}

      <Animated.View
        style={[
          styles.circle,
          done && styles.circleDone,
          active && styles.circleActive,
          active && { transform: [{ scale: circleScale }] },
        ]}
      >
        <Ionicons
          name={done ? 'checkmark' : icon}
          size={15}
          color={done || active ? '#fff' : C.textMuted}
        />
      </Animated.View>
    </View>
  );
}

/**
 * Wizard de pasos del pedido. Refleja el avance del picker:
 * PENDING → IN_PROGRESS → COMPLETED. El paso actual se resalta en azul y late,
 * los ya logrados en verde. Se actualiza solo cuando el estado cambia (polling).
 */
export function OrderStatusStepper({ status }: { status: OrderStatus }) {
  const currentIndex = Math.max(0, STEPS.findIndex((s) => s.key === status));
  const isCompleted = status === 'COMPLETED';

  return (
    <View style={styles.container}>
      {STEPS.map((step, i) => {
        const done = i < currentIndex || isCompleted;
        const active = i === currentIndex && !isCompleted;
        const reachedThis = i <= currentIndex;
        const reachedNext = i + 1 <= currentIndex || isCompleted;

        return (
          <Fragment key={step.key}>
            <View style={styles.stepItem}>
              <View style={styles.circleRow}>
                {/* media línea izquierda */}
                {i > 0 ? (
                  <View style={[styles.line, reachedThis && styles.lineActive]} />
                ) : (
                  <View style={styles.lineSpacer} />
                )}

                <StepCircle active={active} done={done} icon={step.icon} />

                {/* media línea derecha */}
                {i < STEPS.length - 1 ? (
                  <View style={[styles.line, reachedNext && styles.lineActive]} />
                ) : (
                  <View style={styles.lineSpacer} />
                )}
              </View>

              <Text
                style={[
                  styles.label,
                  active && styles.labelActive,
                  done && styles.labelDone,
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  line: {
    flex: 1,
    height: 3,
    backgroundColor: C.border,
    borderRadius: 2,
  },
  lineActive: {
    backgroundColor: C.success,
  },
  lineSpacer: {
    flex: 1,
  },
  circleWrap: {
    width: CIRCLE,
    height: CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: R.full,
    backgroundColor: C.primary,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: R.full,
    backgroundColor: C.surfaceSunken,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: {
    backgroundColor: C.success,
    borderColor: C.success,
  },
  circleActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  label: {
    fontSize: F.xs,
    fontWeight: W.semibold,
    color: C.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  labelActive: {
    color: C.primary,
    fontWeight: W.extra,
  },
  labelDone: {
    color: C.success,
    fontWeight: W.bold,
  },
});

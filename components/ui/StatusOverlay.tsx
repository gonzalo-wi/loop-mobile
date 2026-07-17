import { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S, F, W, Shdw } from '@/lib/theme';

export type OverlayStatus = 'loading' | 'success' | 'error';

export type OverlayAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  icon?: keyof typeof Ionicons.glyphMap;
};

type StatusOverlayProps = {
  visible: boolean;
  status: OverlayStatus;
  title?: string;
  message?: string;
  /** Botones de acción (ej: preguntar algo tras el éxito). Si se pasan, no auto-cierra. */
  actions?: OverlayAction[];
  /** Texto del botón en estado error. Default: "Entendido". */
  dismissLabel?: string;
  /** Se llama al cerrar (botón en error o tap fuera). */
  onDismiss?: () => void;
};

/**
 * Overlay de feedback animado para acciones async (guardar, enviar, etc.).
 * - loading: spinner girando.
 * - success: tilde verde con "pop" (spring).
 * - error: X roja con "pop" + botón para cerrar.
 * Usa Animated nativo (useNativeDriver) → fluido y liviano.
 */
export function StatusOverlay({
  visible,
  status,
  title,
  message,
  actions,
  dismissLabel = 'Entendido',
  onDismiss,
}: StatusOverlayProps) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  // Fade + scale del card al aparecer/desaparecer
  useEffect(() => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: visible ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: visible ? 1 : 0.92,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, overlayOpacity, cardScale]);

  // Spinner en loop mientras carga
  useEffect(() => {
    if (status !== 'loading') return;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 850,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spin.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [status, spin]);

  // "Pop" del ícono al pasar a success/error
  useEffect(() => {
    if (status === 'success' || status === 'error') {
      iconScale.setValue(0);
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 5,
        tension: 140,
        useNativeDriver: true,
      }).start();
    }
  }, [status, iconScale]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
          {status === 'loading' && (
            <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />
          )}

          {status === 'success' && (
            <Animated.View
              style={[styles.iconCircle, styles.iconSuccess, { transform: [{ scale: iconScale }] }]}
            >
              <Ionicons name="checkmark-sharp" size={46} color="#fff" />
            </Animated.View>
          )}

          {status === 'error' && (
            <Animated.View
              style={[styles.iconCircle, styles.iconError, { transform: [{ scale: iconScale }] }]}
            >
              <Ionicons name="close-sharp" size={46} color="#fff" />
            </Animated.View>
          )}

          {title ? <Text style={styles.title}>{title}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {actions && actions.length > 0 ? (
            <View style={styles.actions}>
              {actions.map((action) => {
                const secondary = action.variant === 'secondary';
                return (
                  <Pressable
                    key={action.label}
                    onPress={action.onPress}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      secondary ? styles.actionSecondary : styles.actionPrimary,
                      pressed && styles.dismissPressed,
                    ]}
                  >
                    {action.icon ? (
                      <Ionicons
                        name={action.icon}
                        size={18}
                        color={secondary ? C.textSub : '#fff'}
                      />
                    ) : null}
                    <Text style={[styles.actionText, secondary && styles.actionTextSecondary]}>
                      {action.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : status === 'error' && onDismiss ? (
            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => [styles.dismissBtn, pressed && styles.dismissPressed]}
            >
              <Text style={styles.dismissText}>{dismissLabel}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(14,23,38,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: C.surface,
    borderRadius: R.xl,
    paddingVertical: S.xxl,
    paddingHorizontal: S.xl,
    alignItems: 'center',
    ...Shdw.float,
  },
  spinner: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 5,
    borderColor: C.primaryLight,
    borderTopColor: C.primary,
    marginBottom: S.lg,
  },
  iconCircle: {
    width: 78,
    height: 78,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.lg,
  },
  iconSuccess: {
    backgroundColor: C.success,
  },
  iconError: {
    backgroundColor: C.danger,
  },
  title: {
    fontSize: F.lg,
    fontWeight: W.extra,
    color: C.text,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  message: {
    fontSize: F.sm + 1,
    fontWeight: W.medium,
    color: C.textSub,
    textAlign: 'center',
    marginTop: S.sm,
    lineHeight: 20,
  },
  dismissBtn: {
    marginTop: S.xl,
    alignSelf: 'stretch',
    height: 48,
    borderRadius: R.md,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  dismissText: {
    color: '#fff',
    fontSize: F.md,
    fontWeight: W.extra,
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: S.xl,
    gap: S.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    height: 52,
    borderRadius: R.md,
  },
  actionPrimary: {
    backgroundColor: C.primary,
  },
  actionSecondary: {
    backgroundColor: C.surfaceSunken,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionText: {
    color: '#fff',
    fontSize: F.md,
    fontWeight: W.extra,
  },
  actionTextSecondary: {
    color: C.textSub,
  },
});

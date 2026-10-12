import { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R, S, T } from '@/lib/theme';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

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
 * - loading: spinner girando (tarjeta centrada).
 * - success: tilde verde con "pop" (tarjeta centrada).
 * - error, o cuando hay acciones: panel inferior con la X roja y los botones.
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
  const insets = useSafeAreaInsets();
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

  // Errors and questions are a bottom panel (thumb reach, room for the text);
  // loading and success are a short centered card.
  const asSheet = status === 'error' || (actions !== undefined && actions.length > 0);
  // The sheet slides up from the bottom, reusing the card's enter spring.
  const sheetOffset = cardScale.interpolate({ inputRange: [0.92, 1], outputRange: [SHEET_ENTER_OFFSET, 0] });

  const icon =
    status === 'loading' ? (
      <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />
    ) : (
      <Animated.View
        style={[
          styles.iconCircle,
          status === 'success' ? styles.iconSuccess : styles.iconError,
          { transform: [{ scale: iconScale }] },
        ]}
      >
        <Ionicons
          name={status === 'success' ? 'checkmark-sharp' : 'close-sharp'}
          size={34}
          color={status === 'success' ? C.navy : C.white}
        />
      </Animated.View>
    );

  const buttons =
    actions && actions.length > 0 ? (
      <View style={styles.actions}>
        {actions.map((action) =>
          action.variant === 'secondary' ? (
            <SecondaryButton key={action.label} title={action.label} icon={action.icon} onPress={action.onPress} />
          ) : (
            <PrimaryButton key={action.label} title={action.label} icon={action.icon} onPress={action.onPress} />
          ),
        )}
      </View>
    ) : status === 'error' && onDismiss ? (
      <View style={styles.actions}>
        <PrimaryButton title={dismissLabel} onPress={onDismiss} />
      </View>
    ) : null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onDismiss} statusBarTranslucent>
      <Animated.View
        style={[styles.overlay, asSheet ? styles.overlaySheet : styles.overlayCard, { opacity: overlayOpacity }]}
      >
        {asSheet ? (
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + S.xxl - 4, transform: [{ translateY: sheetOffset }] },
            ]}
          >
            <View style={styles.handle} />
            {icon}
            {title ? <Text style={styles.sheetTitle} accessibilityRole="header">{title}</Text> : null}
            {message ? <Text style={styles.sheetMessage}>{message}</Text> : null}
            {buttons}
          </Animated.View>
        ) : (
          <Animated.View
            style={[styles.card, { transform: [{ scale: cardScale }] }]}
            accessibilityLiveRegion="polite"
          >
            {icon}
            {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
            {message ? <Text style={styles.cardMessage}>{message}</Text> : null}
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
}

const ICON = 64;
const SHEET_ENTER_OFFSET = 80;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.scrim,
  },
  overlayCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S.xxl,
  },
  overlaySheet: {
    justifyContent: 'flex-end',
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: C.white,
    borderRadius: R.block,
    paddingVertical: S.xxl,
    paddingHorizontal: S.xl,
    alignItems: 'center',
    gap: S.sm,
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: R.sheet,
    borderTopRightRadius: R.sheet,
    paddingTop: S.md,
    paddingHorizontal: S.gutterWide,
    gap: S.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.handle,
  },
  spinner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 5,
    borderColor: C.cream,
    borderTopColor: C.navy,
    marginBottom: S.sm,
  },
  iconCircle: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSuccess: { backgroundColor: C.green },
  iconError: { backgroundColor: C.red },
  cardTitle: { ...T.screenTitle, color: C.navy, textAlign: 'center' },
  cardMessage: { ...T.body, color: C.ink2, textAlign: 'center' },
  sheetTitle: { ...T.sheetTitle, color: C.navy },
  sheetMessage: { ...T.body, color: C.ink2 },
  actions: { gap: S.sm, marginTop: S.xs },
});

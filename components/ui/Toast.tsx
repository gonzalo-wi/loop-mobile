import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, H, S, T, Shdw } from '@/lib/theme';

export const TOAST_DURATION_MS = 5000;

type ToastProps = {
  visible: boolean;
  message: string;
  /** Optional green action, e.g. "Deshacer". */
  actionLabel?: string;
  onAction?: () => void;
  onHide: () => void;
  /** Distance from the bottom of the screen, so it sits above the bottom bar. */
  bottomOffset: number;
  durationMs?: number;
};

/** Floating navy pill above the bottom bar; hides itself after a few seconds. */
export function Toast({
  visible,
  message,
  actionLabel,
  onAction,
  onHide,
  bottomOffset,
  durationMs = TOAST_DURATION_MS,
}: ToastProps) {
  // Ref so an inline onHide from the parent doesn't restart the timer on every render.
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => onHideRef.current(), durationMs);
    return () => clearTimeout(id);
  }, [visible, durationMs, message]);

  if (!visible) return null;

  return (
    <View
      style={[styles.toast, { bottom: bottomOffset }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text style={styles.text}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: S.gutter,
    right: S.gutter,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingLeft: S.xl,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 28,
    backgroundColor: C.navy,
    ...Shdw.primaryButton,
  },
  text: {
    ...T.label,
    color: C.white,
    flex: 1,
  },
  action: {
    height: H.pill,
    borderRadius: H.pill / 2,
    paddingHorizontal: S.lg + 2,
    justifyContent: 'center',
    backgroundColor: C.green,
  },
  actionText: {
    ...T.label,
    fontFamily: T.button.fontFamily,
    color: C.navy,
  },
});

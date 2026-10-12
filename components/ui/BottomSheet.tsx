import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R, S, T } from '@/lib/theme';

export type SheetTone = 'success' | 'warning' | 'error' | 'info';

const TONE: Record<SheetTone, { bg: string; fg: string }> = {
  success: { bg: C.green, fg: C.navy },
  warning: { bg: C.orange, fg: C.navy },
  error: { bg: C.red, fg: C.white },
  info: { bg: C.blue, fg: C.white },
};

type BottomSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: SheetTone;
  /** Form fields or extra content between the text and the actions. */
  children?: ReactNode;
  /** Usually a PrimaryButton followed by a SecondaryButton. */
  actions?: ReactNode;
};

/** Bottom panel for notices and short forms: scrim, handle, status icon, title, text, actions. */
export function BottomSheet({
  visible,
  onDismiss,
  title,
  message,
  icon,
  tone = 'info',
  children,
  actions,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const t = TONE[tone];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onDismiss} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { paddingBottom: S.xxl - 4 + insets.bottom }]}>
          <View style={styles.handle} />
          {icon ? (
            <View style={[styles.iconCircle, { backgroundColor: t.bg }]}>
              <Ionicons name={icon} size={30} color={t.fg} />
            </View>
          ) : null}
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {children}
          {actions ? <View style={styles.actions}>{actions}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.scrim,
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
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...T.sheetTitle,
    color: C.navy,
  },
  message: {
    ...T.body,
    color: C.ink2,
  },
  actions: {
    gap: S.sm,
    marginTop: S.xs,
  },
});

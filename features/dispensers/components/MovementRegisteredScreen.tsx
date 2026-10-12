import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, SystemTag } from '@/components/ui';
import { C, H, R, S, T } from '@/lib/theme';
import { getExclusionNotice } from '../lib/movementOutcome';
import { getMovementStatusCells, type StatusCellTone } from '../lib/movementStatusCells';
import type { DispenserMovement } from '../types';

type MovementRegisteredScreenProps = {
  /** The movement just created; null hides the screen. Updated while Odoo resolves. */
  movement: DispenserMovement | null;
  /** Still asking the backend for Aguas/Odoo answers: pending rows show a spinner. */
  followingUp: boolean;
  onNew: () => void;
  onSeeMovements: () => void;
};

const STATUS_ICON: Record<StatusCellTone, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  ok: { bg: C.green, fg: C.navy, icon: 'checkmark' },
  error: { bg: C.red, fg: C.white, icon: 'close' },
  neutral: { bg: C.cream, fg: C.ink2, icon: 'remove' },
  // Final pending states (nothing sent) or follow-up window over: no spinner.
  pending: { bg: C.orange, fg: C.navy, icon: 'time-outline' },
};

/** Confirmation after registering: what was sent and how each system is doing. */
export function MovementRegisteredScreen({
  movement,
  followingUp,
  onNew,
  onSeeMovements,
}: MovementRegisteredScreenProps) {
  const insets = useSafeAreaInsets();
  if (!movement) return null;

  const isLoad = movement.type === 'LOAD';
  const count = movement.serials.length;
  const notice = getExclusionNotice(movement);
  const title = isLoad ? 'Carga registrada' : 'Descarga registrada';
  // Registered in LOOP but nothing went to Aguas: a warning, not a success.
  const nothingSent = movement.status === 'SKIPPED_UNREGISTERED';

  return (
    <Modal
      visible
      animationType="fade"
      // A notice that needs confirmation can't be skipped with the back button.
      onRequestClose={notice?.requiresConfirmation ? () => undefined : onNew}
      statusBarTranslucent
    >
      <View style={[styles.root, nothingSent && styles.rootWarning]}>
        <View pointerEvents="none" style={styles.deco} />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + S.xxxl, paddingBottom: insets.bottom + S.xxl - 4 },
          ]}
        >
          <View style={styles.check}>
            <Ionicons
              name={nothingSent ? 'alert' : 'checkmark'}
              size={52}
              color={nothingSent ? C.orange : C.green}
            />
          </View>

          <View style={styles.titles}>
            <Text style={styles.title} accessibilityRole="header" accessibilityLiveRegion="polite">
              {title}
            </Text>
            <Text style={styles.subtitle}>
              {count} dispenser{count !== 1 ? 's' : ''} · Reparto {movement.routeCode}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Estado por sistema</Text>
            {getMovementStatusCells(movement).map((cell, i) => {
              const spinning = cell.tone === 'pending' && followingUp;
              const icon = STATUS_ICON[cell.tone];
              return (
                <View key={cell.system} style={[styles.row, i > 0 && styles.rowDivider]}>
                  <SystemTag system={cell.system === 'Aguas' ? 'aguas' : 'odoo'} />
                  <Text style={styles.rowStatus}>{cell.status}</Text>
                  {spinning ? (
                    <ActivityIndicator color={C.orange} accessibilityLabel="Enviando" />
                  ) : (
                    <View style={[styles.rowIcon, { backgroundColor: icon.bg }]}>
                      <Ionicons name={icon.icon} size={16} color={icon.fg} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {notice ? (
            <View style={styles.notice}>
              {notice.title !== title ? <Text style={styles.noticeTitle}>{notice.title}</Text> : null}
              <Text style={styles.noticeText}>{notice.message}</Text>
            </View>
          ) : null}

          <Text style={styles.hint}>Podés seguir el envío desde Movimientos.</Text>

          <View style={styles.actions}>
            <PrimaryButton title={isLoad ? 'Nueva carga' : 'Nueva descarga'} icon="add" onPress={onNew} />
            <Pressable
              onPress={onSeeMovements}
              accessibilityRole="button"
              style={({ pressed }) => [styles.outline, pressed && styles.pressed]}
            >
              <Text style={styles.outlineText}>Ver movimientos de hoy</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const CHECK = 96;
const DECO = 220;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.green, overflow: 'hidden' },
  rootWarning: { backgroundColor: C.orange },
  deco: {
    position: 'absolute',
    top: -90,
    right: -90,
    width: DECO,
    height: DECO,
    borderRadius: DECO / 2,
    backgroundColor: C.blue,
  },
  content: { flexGrow: 1, paddingHorizontal: S.gutterWide, gap: S.xl },
  check: {
    width: CHECK,
    height: CHECK,
    borderRadius: CHECK / 2,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { gap: S.xs },
  title: { ...T.display, color: C.navy },
  subtitle: { ...T.section, fontFamily: T.label.fontFamily, color: C.ink2OnGreen, fontVariant: ['tabular-nums'] },
  card: { padding: S.lg + 2, borderRadius: R.card, backgroundColor: C.white },
  cardLabel: { ...T.label, color: C.ink2, marginBottom: S.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 56 },
  rowDivider: { borderTopWidth: 1, borderTopColor: C.line },
  rowStatus: { ...T.data, color: C.navy, flex: 1, textAlign: 'right' },
  rowIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  notice: { gap: S.xs, padding: S.lg, borderRadius: R.field, backgroundColor: C.white },
  noticeTitle: { ...T.label, color: C.navy },
  noticeText: { ...T.body, color: C.navy },
  hint: { ...T.label, fontFamily: T.secondary.fontFamily, fontSize: T.body.fontSize, color: C.ink2OnGreen, paddingLeft: S.xs },
  actions: { marginTop: 'auto', gap: S.md - 2 },
  outline: {
    height: H.primaryButton,
    borderRadius: H.primaryButton / 2,
    borderWidth: 2,
    borderColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: { ...T.button, color: C.navy },
  pressed: { opacity: 0.8 },
});

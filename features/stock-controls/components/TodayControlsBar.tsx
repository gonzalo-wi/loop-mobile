import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StockControl } from '../types';
import { C, H, R, S, T } from '@/lib/theme';
import { formatClockTime } from '@/lib/dateFormat';

type Props = {
  controls: StockControl[];
  pending: number;
  accepted: number;
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  CONTROLLED: { label: 'Registrado', color: C.ink2, bg: C.cream, icon: 'document-text-outline' },
  PENDING_DRIVER_APPROVAL: { label: 'Esperando', color: C.orangeText, bg: C.orangeSoft, icon: 'time-outline' },
  ACCEPTED_BY_DRIVER: { label: 'Aceptado', color: C.greenDot, bg: C.greenSoft, icon: 'checkmark-circle' },
  REJECTED_BY_DRIVER: { label: 'Rechazado', color: C.redText, bg: C.redSoft, icon: 'close-circle' },
};

/**
 * Barra compacta con el estado en vivo de los controles del día del
 * controlador. Al tocarla abre un modal con el detalle de cada uno.
 * No bloquea el trabajo: el controlador sigue cargando camiones.
 */
export function TodayControlsBar({ controls, pending, accepted }: Props) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  if (controls.length === 0) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.bar}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Mis controles de hoy"
      >
        <View style={styles.barIcon}>
          <Ionicons name="layers" size={20} color={C.navy} />
        </View>
        <Text style={styles.barTitle}>Mis controles de hoy</Text>

        <View style={styles.counts}>
          {pending > 0 && (
            <View style={[styles.countChip, { backgroundColor: C.orangeSoft }]}>
              <Ionicons name="time" size={14} color={C.orangeText} />
              <Text style={[styles.countText, { color: C.orangeText }]}>{pending}</Text>
            </View>
          )}
          <View style={[styles.countChip, { backgroundColor: C.greenSoft }]}>
            <Ionicons name="checkmark-circle" size={14} color={C.greenDot} />
            <Text style={[styles.countText, { color: C.greenDot }]}>{accepted}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.ink2} />
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle} accessibilityRole="header">
                Controles de hoy
              </Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <Ionicons name="close" size={24} color={C.navy} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetHint}>
              Se actualiza solo. Un control marcado “Aceptado” significa que el repartidor dio conformidad.
            </Text>

            <FlatList
              data={controls}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const meta = STATUS_META[item.status] ?? STATUS_META.CONTROLLED;
                const isExit = item.type === 'EXIT';
                return (
                  <View style={styles.row}>
                    <View style={styles.rowLeft}>
                      <Text style={styles.rowRoute}>Reparto {item.routeCode}</Text>
                      <Text style={styles.rowMeta}>
                        {isExit ? 'Salida' : 'Entrada'} · {formatClockTime(item.createdAt)} · {item.items.length} prod.
                      </Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon} size={15} color={meta.color} />
                      <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.white,
    marginHorizontal: S.gutter,
    marginTop: S.md,
    minHeight: H.row,
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    borderRadius: R.row,
  },
  barIcon: {
    width: H.touch - 4,
    height: H.touch - 4,
    borderRadius: R.cell,
    backgroundColor: C.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTitle: {
    ...T.label,
    flex: 1,
    color: C.navy,
  },
  counts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  countChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    height: H.statusCell,
    paddingHorizontal: S.md,
    borderRadius: R.cell,
  },
  countText: {
    ...T.secondary,
    fontFamily: T.button.fontFamily,
    fontVariant: ['tabular-nums'],
  },

  backdrop: {
    flex: 1,
    backgroundColor: C.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: R.sheet,
    borderTopRightRadius: R.sheet,
    paddingHorizontal: S.gutterWide,
    paddingTop: S.md,
    maxHeight: '75%',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.handle,
    marginBottom: S.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    ...T.sheetTitle,
    flex: 1,
    color: C.navy,
  },
  closeBtn: {
    width: H.touch,
    height: H.touch,
    borderRadius: H.touch / 2,
    backgroundColor: C.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHint: {
    ...T.body,
    color: C.ink2,
    marginTop: S.xs,
    marginBottom: S.lg,
  },
  list: {
    gap: S.sm,
    paddingBottom: S.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.cream,
    borderRadius: R.row,
    minHeight: H.row,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowRoute: {
    ...T.data,
    color: C.navy,
    fontVariant: ['tabular-nums'],
  },
  rowMeta: {
    ...T.secondary,
    color: C.ink2,
    fontVariant: ['tabular-nums'],
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    height: H.statusCell,
    paddingHorizontal: S.md,
    borderRadius: R.cell,
    marginLeft: S.sm,
  },
  statusText: {
    ...T.secondary,
    fontFamily: T.button.fontFamily,
  },
});

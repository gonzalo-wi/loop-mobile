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
import type { StockControl } from '../types';
import { C, R, S, F, W, Shdw } from '@/lib/theme';

type Props = {
  controls: StockControl[];
  pending: number;
  accepted: number;
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  CONTROLLED: { label: 'Registrado', color: C.textSub, bg: C.surfaceSunken, icon: 'document-text-outline' },
  PENDING_DRIVER_APPROVAL: { label: 'Esperando', color: C.warning, bg: C.warningLight, icon: 'time-outline' },
  ACCEPTED_BY_DRIVER: { label: 'Aceptado', color: C.success, bg: C.successLight, icon: 'checkmark-circle' },
  REJECTED_BY_DRIVER: { label: 'Rechazado', color: C.danger, bg: C.dangerLight, icon: 'close-circle' },
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Barra compacta con el estado en vivo de los controles del día del
 * controlador. Al tocarla abre un modal con el detalle de cada uno.
 * No bloquea el trabajo: el controlador sigue cargando camiones.
 */
export function TodayControlsBar({ controls, pending, accepted }: Props) {
  const [open, setOpen] = useState(false);

  if (controls.length === 0) return null;

  return (
    <>
      <TouchableOpacity style={styles.bar} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <View style={styles.barIcon}>
          <Ionicons name="layers" size={16} color={C.primary} />
        </View>
        <Text style={styles.barTitle}>Mis controles de hoy</Text>

        <View style={styles.counts}>
          {pending > 0 && (
            <View style={[styles.countChip, { backgroundColor: C.warningLight }]}>
              <Ionicons name="time" size={12} color={C.warning} />
              <Text style={[styles.countText, { color: C.warning }]}>{pending}</Text>
            </View>
          )}
          <View style={[styles.countChip, { backgroundColor: C.successLight }]}>
            <Ionicons name="checkmark-circle" size={12} color={C.success} />
            <Text style={[styles.countText, { color: C.success }]}>{accepted}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Controles de hoy</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={C.textSub} />
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
                        {isExit ? 'Salida' : 'Entrada'} · {formatTime(item.createdAt)} · {item.items.length} prod.
                      </Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon} size={13} color={meta.color} />
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
    gap: S.sm,
    backgroundColor: C.surface,
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    ...Shdw.card,
  },
  barIcon: {
    width: 30,
    height: 30,
    borderRadius: R.sm,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTitle: {
    flex: 1,
    fontSize: F.sm + 1,
    fontWeight: W.bold,
    color: C.text,
  },
  counts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.full,
  },
  countText: {
    fontSize: F.sm,
    fontWeight: W.extra,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(14,23,38,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: R.xxl,
    borderTopRightRadius: R.xxl,
    paddingHorizontal: S.lg,
    paddingBottom: S.xxl,
    paddingTop: S.md,
    maxHeight: '75%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: C.borderStrong,
    marginBottom: S.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: F.xl,
    fontWeight: W.extra,
    color: C.text,
  },
  sheetHint: {
    fontSize: F.sm,
    color: C.textMuted,
    marginTop: S.xs,
    marginBottom: S.md,
    lineHeight: 18,
  },
  list: {
    gap: S.sm,
    paddingBottom: S.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowRoute: {
    fontSize: F.md,
    fontWeight: W.extra,
    color: C.text,
  },
  rowMeta: {
    fontSize: F.sm,
    color: C.textMuted,
    fontWeight: W.medium,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: R.full,
  },
  statusText: {
    fontSize: F.sm,
    fontWeight: W.bold,
  },
});

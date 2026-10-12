import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, H, R, S, T } from '@/lib/theme';
import { groupSerialsByExclusion, type NumberedSerial } from '../lib/serialGroups';
import { BaggedToggle } from './BaggedToggle';

type DetailSerialListProps = {
  serials: string[];
  excluded: string[];
  /** Header of the excluded group, e.g. "No disponibles en Odoo · no enviados". */
  excludedTitle: string;
  /** Only on UNLOAD. */
  bagged?: { codes: string[]; onToggle?: (code: string) => void };
  /** Editing: each row gets a remove button. */
  onRemove?: (code: string) => void;
};

/** Serials of a movement in one white card; the excluded ones share a single header with their count. */
export function DetailSerialList({ serials, excluded, excludedTitle, bagged, onRemove }: DetailSerialListProps) {
  if (serials.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>Sin dispensers</Text>
      </View>
    );
  }

  const groups = groupSerialsByExclusion(serials, excluded);

  function renderRow(item: NumberedSerial, first: boolean) {
    return (
      <View key={item.code} style={[styles.row, !first && styles.rowDivider]}>
        <Text style={styles.position}>{item.position}</Text>
        <Text style={styles.serial}>{item.code}</Text>
        {bagged ? (
          <BaggedToggle
            code={item.code}
            bagged={bagged.codes.includes(item.code)}
            onPress={bagged.onToggle ? () => bagged.onToggle?.(item.code) : undefined}
          />
        ) : null}
        {onRemove ? (
          <Pressable
            onPress={() => onRemove(item.code)}
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${item.code}`}
            style={styles.remove}
          >
            <Ionicons name="close" size={20} color={C.ink2} />
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {groups.map((group) => (
        <View key={group.excluded ? 'excluded' : 'rest'} style={styles.card}>
          {group.excluded ? (
            <View style={styles.groupHeader}>
              <View style={styles.groupIcon}>
                <Ionicons name="alert" size={18} color={C.navy} />
              </View>
              <Text style={styles.groupTitle}>{excludedTitle}</Text>
              <Text style={styles.groupCount}>
                {group.serials.length} de {serials.length}
              </Text>
            </View>
          ) : null}
          <View style={styles.rows}>{group.serials.map((item, i) => renderRow(item, i === 0))}</View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: S.sm },
  card: {
    borderRadius: R.card,
    backgroundColor: C.white,
    overflow: 'hidden',
  },
  empty: { ...T.body, color: C.ink2, textAlign: 'center', padding: S.xl },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingVertical: S.md,
    paddingHorizontal: S.lg,
    backgroundColor: C.orangeSoft,
  },
  groupIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: { ...T.label, fontSize: T.body.fontSize, color: C.navy, flex: 1 },
  groupCount: { ...T.label, fontFamily: T.button.fontFamily, color: C.navy, fontVariant: ['tabular-nums'] },
  rows: { paddingHorizontal: S.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    minHeight: 56,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: C.line },
  position: {
    ...T.secondary,
    fontFamily: T.label.fontFamily,
    minWidth: 24,
    color: C.ink2,
    fontVariant: ['tabular-nums'],
  },
  serial: { ...T.data, color: C.navy, flex: 1, fontVariant: ['tabular-nums'] },
  remove: {
    width: H.touch,
    height: H.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

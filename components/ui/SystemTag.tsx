import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S, T } from '@/lib/theme';

type SystemTagProps = {
  system: 'aguas' | 'odoo';
};

const SYSTEM = {
  aguas: { label: 'AGUAS', bg: C.navy, icon: 'water-outline' as const },
  odoo: { label: 'ODOO', bg: C.odoo, icon: null },
};

/** Small uppercase tag naming the external system a status belongs to. */
export function SystemTag({ system }: SystemTagProps) {
  const s = SYSTEM[system];
  return (
    <View style={[styles.tag, { backgroundColor: s.bg }]}>
      {s.icon ? <Ionicons name={s.icon} size={12} color={C.white} /> : null}
      <Text style={styles.text}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: S.xs,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  text: {
    ...T.systemTag,
    color: C.white,
  },
});

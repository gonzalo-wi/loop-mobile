import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S, T } from '@/lib/theme';

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint?: string;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({ icon, title, hint, style }: EmptyStateProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={28} color={C.navy} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.xs,
    paddingVertical: S.xl,
    paddingHorizontal: 32,
    borderRadius: R.block,
    backgroundColor: C.white,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.sm,
  },
  title: {
    ...T.section,
    color: C.navy,
    textAlign: 'center',
  },
  hint: {
    ...T.body,
    color: C.ink2,
    textAlign: 'center',
  },
});

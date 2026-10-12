import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C, S, T } from '@/lib/theme';
import { CircleButton } from './CircleButton';

type ScreenHeaderProps = {
  title: string;
  /** Stack screens get a back button; tab screens pass `subtitle` and no onBack. */
  onBack?: () => void;
  subtitle?: string;
  /** Right slot: an action pill ("Hoy") or a direction pill. */
  right?: ReactNode;
};

/**
 * Screen header. With onBack: circle back button + 22pt title.
 * Without it (tab screens): 32pt title with the date underneath.
 */
export function ScreenHeader({ title, onBack, subtitle, right }: ScreenHeaderProps) {
  const isTab = !onBack;
  return (
    <View style={styles.row}>
      {onBack ? (
        <CircleButton icon="chevron-back" onPress={onBack} accessibilityLabel="Volver" />
      ) : null}
      <View style={styles.titles}>
        <Text style={isTab ? styles.tabTitle : styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingHorizontal: S.gutter,
    paddingVertical: S.sm,
  },
  titles: {
    flex: 1,
  },
  title: {
    ...T.screenTitle,
    color: C.navy,
  },
  tabTitle: {
    ...T.tabTitle,
    color: C.navy,
  },
  subtitle: {
    ...T.secondary,
    color: C.ink2,
  },
});

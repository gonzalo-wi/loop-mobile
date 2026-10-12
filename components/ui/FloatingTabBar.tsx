import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Tabs } from 'expo-router';
import { C, R, S, T, Shdw } from '@/lib/theme';
import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN, isTabHidden, visibleBadge } from '@/lib/tabBar';

export { TAB_BAR_HEIGHT, tabBarClearance } from '@/lib/tabBar';

// Taken from Tabs so we don't import @react-navigation/bottom-tabs, which is only a transitive dependency.
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/**
 * Floating white pill with the tabs; the active one is a navy block.
 * Mirrors the default bar's behavior: hidden routes (`href: null`), badges,
 * tabPress/tabLongPress events and accessibility labels.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter((route) => !isTabHidden(descriptors[route.key].options));

  return (
    <View style={[styles.bar, { bottom: TAB_BAR_MARGIN + insets.bottom }]} accessibilityRole="tablist">
      {visibleRoutes.map((route) => {
        const { options } = descriptors[route.key];
        const focused = state.routes[state.index]?.key === route.key;
        const color = focused ? C.white : C.ink2;
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : typeof options.title === 'string'
              ? options.title
              : route.name;
        const badge = visibleBadge(options.tabBarBadge);
        const a11yLabel =
          options.tabBarAccessibilityLabel ?? (badge ? `${label}, ${badge} pendientes` : label);

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            testID={options.tabBarButtonTestID}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={a11yLabel}
            style={[styles.tab, focused && styles.tabActive]}
          >
            <View>
              {options.tabBarIcon?.({ focused, color, size: 22 })}
              {badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: S.gutter,
    right: S.gutter,
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    gap: S.xs,
    padding: S.sm,
    borderRadius: R.card,
    backgroundColor: C.white,
    ...Shdw.tabBar,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: C.navy,
  },
  label: {
    ...T.secondary,
    fontFamily: T.label.fontFamily,
    fontSize: 12,
    lineHeight: 16,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...T.systemTag,
    letterSpacing: 0,
    color: C.white,
  },
});

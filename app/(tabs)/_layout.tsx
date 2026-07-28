import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useRouteStore } from '@/store/routeStore';
import { C } from '@/lib/theme';

const INACTIVE = '#9AA6BA';

/** Ícono del tab dentro de una cápsula que se pinta de azul claro al estar activo. */
function TabPill({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  return <View style={[styles.pill, focused && styles.pillActive]}>{children}</View>;
}

export default function TabLayout() {
  const { user } = useAuthStore();
  const { pendingCount } = useRouteStore();
  const insets = useSafeAreaInsets();
  const isDriver = user?.role === 'REPARTIDOR';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: C.border,
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: 10 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700' as const,
          marginTop: 3,
        },
        headerStyle: { backgroundColor: C.primary },
        headerTintColor: C.onHeader,
        headerTitleStyle: { fontWeight: '800', color: C.onHeader, fontSize: 18 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          headerShown: false,
          tabBarBadge: isDriver && pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: C.danger, fontSize: 10 },
          tabBarIcon: ({ color, focused }) => (
            <TabPill focused={focused}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            </TabPill>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pedidos',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabPill focused={focused}>
              <Ionicons name={focused ? 'cart' : 'cart-outline'} size={22} color={color} />
            </TabPill>
          ),
        }}
      />
      <Tabs.Screen
        name="remito"
        options={{
          title: 'Remito',
          headerShown: false,
          // El remito es del reparto del repartidor. href:null lo saca de la barra por completo.
          href: isDriver ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabPill focused={focused}>
              <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={22} color={color} />
            </TabPill>
          ),
        }}
      />
      <Tabs.Screen
        name="arrivals"
        options={{
          title: 'En ruta',
          headerShown: false,
          href: isDriver ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <TabPill focused={focused}>
              <MaterialCommunityIcons name={focused ? 'truck-fast' : 'truck-fast-outline'} size={22} color={color} />
            </TabPill>
          ),
        }}
      />
      <Tabs.Screen
        name="fleet"
        options={{
          title: 'Mi camión',
          headerShown: false,
          // Solo el repartidor tiene un camión propio para ubicar.
          href: isDriver ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabPill focused={focused}>
              <MaterialCommunityIcons name={focused ? 'truck' : 'truck-outline'} size={22} color={color} />
            </TabPill>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabPill focused={focused}>
              <Ionicons name={focused ? 'time' : 'time-outline'} size={22} color={color} />
            </TabPill>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: 56,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: C.primaryLight,
  },
});

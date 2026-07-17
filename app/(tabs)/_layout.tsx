import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useRouteStore } from '@/store/routeStore';
import { C } from '@/lib/theme';

export default function TabLayout() {
  const { user } = useAuthStore();
  const { pendingCount } = useRouteStore();
  const insets = useSafeAreaInsets();
  const isDriver = user?.role === 'REPARTIDOR';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: '#A5B0C2',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: C.border,
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700' as const,
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
          title: isDriver ? 'Pendientes' : 'Inicio',
          headerShown: false,
          tabBarBadge: isDriver && pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: C.danger },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={isDriver
                ? (focused ? 'checkmark-circle' : 'checkmark-circle-outline')
                : (focused ? 'home' : 'home-outline')}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pedidos',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'cart' : 'cart-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="arrivals"
        options={{
          title: 'En ruta',
          headerShown: false,
          tabBarButton: isDriver ? () => null : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons name={focused ? 'truck' : 'truck-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="fleet"
        options={{
          title: 'Buscar',
          headerShown: false,
          // Solo el repartidor tiene un camión propio para ubicar.
          tabBarButton: isDriver ? undefined : () => null,
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons name={focused ? 'truck' : 'truck-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

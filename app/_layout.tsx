import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/authStore';
import { useRouteStore } from '@/store/routeStore';
import { getToken, getStoredUser, getStoredRoute } from '@/lib/storage';
import { AppUpdateGate } from '@/components/AppUpdateGate';
import { C, T } from '@/lib/theme';
import { FONT_ASSETS } from '@/lib/fontAssets';

/** `navigatorReady` is false while the Stack is not mounted yet (fonts loading). */
function useAuthGuard(navigatorReady: boolean) {
  const { user, setUser, isLoading, setLoading } = useAuthStore();
  const { setRoute } = useRouteStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    async function init() {
      try {
        const [token, storedUser, storedRoute] = await Promise.all([
          getToken(),
          getStoredUser(),
          getStoredRoute(),
        ]);
        if (token && storedUser) {
          setUser({ ...storedUser, token });
        }
        if (storedRoute) {
          setRoute(storedRoute);
        }
      } catch {
        // token inválido → va a login
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (isLoading || !navigatorReady) return;

    const inProtected =
      segments[0] === '(tabs)' ||
      segments[0] === 'new-control' ||
      segments[0] === 'edit-control' ||
      segments[0] === 'approval-detail' ||
      segments[0] === 'create-order' ||
      segments[0] === 'order-detail' ||
      segments[0] === 'dispensers' ||
      segments[0] === 'dispenser-movements' ||
      segments[0] === 'dispenser-movement-detail';

    if (!user && inProtected) {
      router.replace('/login');
    } else if (user && segments[0] === 'login') {
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading, navigatorReady]);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const fontsSettled = fontsLoaded || !!fontError;
  useAuthGuard(fontsSettled);

  useEffect(() => {
    if (fontError) {
      // Not fatal: text falls back to the system font.
      console.warn('Failed to load Plus Jakarta Sans, using system font', fontError);
    }
  }, [fontError]);

  if (!fontsSettled) return null;

  return (
    <>
      {/* Dark icons on the cream UI; screens with a navy top (login) override it while mounted. */}
      <StatusBar style="dark" />
      <Stack
      screenOptions={{
        headerStyle: { backgroundColor: C.primary },
        headerTintColor: C.onHeader,
        headerTitleStyle: { fontFamily: T.section.fontFamily, fontSize: T.section.fontSize },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: C.bg },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="new-control"
        options={{
          title: 'Nuevo Control',
          headerBackTitle: 'Atrás',
        }}
      />
      <Stack.Screen
        name="edit-control"
        options={{
          title: 'Control',
          headerBackTitle: 'Historial',
        }}
      />
      <Stack.Screen
        name="approval-detail"
        options={{
          title: 'Control Pendiente',
          headerBackTitle: 'Inicio',
        }}
      />
      <Stack.Screen
        name="create-order"
        options={{
          title: 'Nuevo Pedido',
          headerBackTitle: 'Pedidos',
        }}
      />
      <Stack.Screen
        name="order-detail"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="dispensers"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="dispenser-movements"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="dispenser-movement-detail"
        options={{
          headerShown: false,
        }}
      />
      </Stack>
      <AppUpdateGate />
    </>
  );
}

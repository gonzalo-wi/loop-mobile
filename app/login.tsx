import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import type { ScrollView as ScrollViewType } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useRouteStore } from '@/store/routeStore';
import { login } from '@/features/auth/services/authApi';
import { SessionExpiredNotice } from '@/features/auth/components/SessionExpiredNotice';
import { getAllRoutes } from '@/features/stock-controls/services/routesApi';
import { saveToken, saveUser, saveRoute } from '@/lib/storage';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import { formatVersionLabel } from '@/features/app-update/utils';
import { INSTALLED_VERSION } from '@/features/app-update/installedVersion';
import {
  AppLogo,
  AppTextField,
  PrimaryButton,
  ErrorMessage,
  StatusOverlay,
  type OverlayStatus,
} from '@/components/ui';
import { C, S, T } from '@/lib/theme';

const { height: SCREEN_H } = Dimensions.get('window');
const HERO_H = Math.min(Math.round(SCREEN_H * 0.42), 340);
const HERO_RADIUS = 40;

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<{
    visible: boolean;
    status: OverlayStatus;
    title?: string;
    message?: string;
  }>({ visible: false, status: 'loading' });

  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const passwordRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollViewType>(null);
  const { setUser, sessionExpired } = useAuthStore();
  const { setRoute } = useRouteStore();
  const router = useRouter();

  const canSubmit = username.trim().length > 0 && password.length > 0;

  // Al abrir el teclado colapsamos el hero (logo) para que la tarjeta suba
  // y queden visibles los dos inputs + el botón.
  const keyboardVisible = keyboardHeight > 0;
  const heroCollapsed = insets.top + 104;
  const heroHeight = useRef(new Animated.Value(HERO_H)).current;

  useEffect(() => {
    Animated.timing(heroHeight, {
      toValue: keyboardVisible ? heroCollapsed : HERO_H,
      duration: Platform.OS === 'ios' ? 260 : 200,
      useNativeDriver: false,
    }).start();
  }, [keyboardVisible, heroCollapsed, heroHeight]);

  function scrollToBottom() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }

  async function handleLogin() {
    if (!username.trim() || !password) {
      setError('Ingresá usuario y contraseña');
      return;
    }

    setLoading(true);
    setError(null);
    setOverlay({ visible: true, status: 'loading', title: 'Verificando acceso...' });

    try {
      const response = await login({ username: username.trim(), password });

      await Promise.all([
        saveToken(response.token),
        saveUser({
          id: response.id,
          name: response.name,
          username: response.username,
          role: response.role,
        }),
      ]);

      setUser({
        id: response.id,
        name: response.name,
        username: response.username,
        role: response.role,
        token: response.token,
      });

      if (response.role === 'REPARTIDOR') {
        try {
          const routes = await getAllRoutes();
          const myRoute = routes.find((r) => r.driverId === response.id);
          if (myRoute) {
            const routeData = {
              routeId: myRoute.id,
              routeCode: myRoute.code,
              branchId: myRoute.branchId,
              branchName: myRoute.branchName,
              truckPlate: myRoute.truckPlate,
            };
            await saveRoute(routeData);
            setRoute(routeData);
          }
        } catch {
          // Si falla la carga de ruta no bloqueamos el login
        }
      }

      setOverlay({
        visible: true,
        status: 'success',
        title: `¡Hola, ${response.name.split(' ')[0]}!`,
        message: 'Acceso correcto. Entrando...',
      });
      setTimeout(() => router.replace('/(tabs)'), 1100);
    } catch (e) {
      setOverlay({ visible: false, status: 'loading' });
      setError(e instanceof Error ? e.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      {/* Light icons over the navy hero */}
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + S.xxl - 4 + keyboardHeight },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          {/* Navy hero; collapses while the keyboard is open so both fields and the button fit */}
          <Animated.View
            style={[styles.hero, { paddingTop: insets.top + S.xl, height: heroHeight }]}
          >
            <View pointerEvents="none" style={styles.decoBlue} />
            <View pointerEvents="none" style={styles.decoGreen} />
            <AppLogo size={keyboardVisible ? 'md' : 'lg'} showText={!keyboardVisible} />
          </Animated.View>

          <View style={styles.body}>
            <Text style={styles.title} accessibilityRole="header">Iniciar sesión</Text>
            <Text style={styles.subtitle}>Ingresá con tu usuario asignado</Text>

            <View style={styles.form}>
              {sessionExpired && !error && <SessionExpiredNotice />}
              <ErrorMessage message={error} />

              <AppTextField
                label="Usuario"
                icon="person-outline"
                placeholder="Tu usuario"
                value={username}
                onChangeText={(t) => {
                  setUsername(t);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!loading}
              />

              <AppTextField
                ref={passwordRef}
                label="Contraseña"
                icon="lock-closed-outline"
                placeholder="Tu contraseña"
                secure
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (error) setError(null);
                }}
                onFocus={scrollToBottom}
                autoComplete="current-password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!loading}
              />

              <View style={styles.buttonWrap}>
                <PrimaryButton
                  title="Ingresar"
                  icon="arrow-forward"
                  iconPosition="end"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={!canSubmit}
                />
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.secureRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color={C.ink2} />
                <Text style={styles.secureText}>Acceso operativo seguro · Ivess</Text>
              </View>
              <Text style={styles.version}>{formatVersionLabel(INSTALLED_VERSION)}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <StatusOverlay
        visible={overlay.visible}
        status={overlay.status}
        title={overlay.title}
        message={overlay.message}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },

  hero: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S.xxl - 4,
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
    backgroundColor: C.navy,
  },
  decoBlue: {
    position: 'absolute',
    top: -90,
    right: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: C.blue,
  },
  decoGreen: {
    position: 'absolute',
    bottom: -90,
    left: -80,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: C.green,
  },

  body: {
    flexGrow: 1,
    paddingTop: S.xxl,
    paddingHorizontal: S.gutterWide,
  },
  title: {
    ...T.blockTitle,
    fontSize: 28,
    lineHeight: 34,
    color: C.navy,
  },
  subtitle: {
    ...T.body,
    color: C.ink2,
    marginTop: S.xs,
  },

  form: { gap: S.lg, marginTop: S.xxl - 4 },
  buttonWrap: { marginTop: S.xs + 2 },

  footer: {
    marginTop: 'auto',
    paddingTop: S.xxl,
    alignItems: 'center',
    gap: S.xs,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs + 2,
  },
  secureText: {
    ...T.secondary,
    color: C.ink2,
  },
  version: {
    ...T.secondary,
    fontSize: 12,
    lineHeight: 16,
    color: C.ink2,
    fontVariant: ['tabular-nums'],
  },
});

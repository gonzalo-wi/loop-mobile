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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useRouteStore } from '@/store/routeStore';
import { login } from '@/features/auth/services/authApi';
import { getAllRoutes } from '@/features/stock-controls/services/routesApi';
import { saveToken, saveUser, saveRoute } from '@/lib/storage';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import {
  AppLogo,
  AppTextField,
  PrimaryButton,
  ErrorMessage,
  StatusOverlay,
  type OverlayStatus,
} from '@/components/ui';
import { C, S, F, W, R } from '@/lib/theme';

const { height: SCREEN_H } = Dimensions.get('window');
const HERO_H = Math.min(Math.round(SCREEN_H * 0.40), 300);
const HERO_BG = '#162359';

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
  const { setUser } = useAuthStore();
  const { setRoute } = useRouteStore();
  const router = useRouter();

  const canSubmit = username.trim().length > 0 && password.length > 0;

  // Al abrir el teclado colapsamos el hero (logo) para que la tarjeta suba
  // y queden visibles los dos inputs + el botón.
  const keyboardVisible = keyboardHeight > 0;
  const heroCollapsed = insets.top + 84;
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
      {/* Hero background — fijo detrás de todo */}
      <View pointerEvents="none" style={styles.heroBg}>
        <View style={styles.heroDeco1} />
        <View style={styles.heroDeco2} />
        <View style={styles.heroDeco3} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + S.xl + keyboardHeight },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo en la sección oscura — se colapsa con el teclado abierto */}
          <Animated.View
            style={[styles.heroContent, { paddingTop: insets.top, height: heroHeight }]}
          >
            <AppLogo
              onDark
              size={keyboardVisible ? 'md' : 'lg'}
              showText={!keyboardVisible}
              tagline="Control operativo de repartos"
            />
          </Animated.View>

          {/* Sheet blanco con bordes redondeados arriba — superpuesto al hero */}
          <View style={[styles.sheet, keyboardVisible && styles.sheetCompact]}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>Iniciar sesión</Text>
            <Text style={styles.sheetSub}>Ingresá con tu usuario asignado</Text>

            <View style={styles.form}>
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
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!loading}
              />

              <View style={styles.buttonWrap}>
                <PrimaryButton
                  title="Ingresar"
                  icon="arrow-forward"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={!canSubmit}
                />
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.divider} />
              <View style={styles.secureRow}>
                <Ionicons name="shield-checkmark" size={13} color={C.textFaint} />
                <Text style={styles.secureText}>Acceso operativo seguro · Ivess</Text>
              </View>
              <Text style={styles.version}>LOOP v1.0.0</Text>
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
  screen: { flex: 1, backgroundColor: C.surface },
  flex: { flex: 1 },

  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_H + 36,
    backgroundColor: HERO_BG,
    overflow: 'hidden',
  },
  // Círculo grande esquina superior derecha — profundidad sutil
  heroDeco1: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 999,
    top: -140,
    right: -110,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  // Círculo mediano inferior izquierda — acento de marca
  heroDeco2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    bottom: -50,
    left: -70,
    backgroundColor: 'rgba(43,80,224,0.22)',
  },
  // Círculo chico superior izquierda — textura leve
  heroDeco3: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 999,
    top: 30,
    left: 24,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },

  scroll: { flexGrow: 1 },

  heroContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S.xxl,
  },

  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xxl + 6,
    borderTopRightRadius: R.xxl + 6,
    marginTop: -36,
    paddingHorizontal: S.xl + 4,
    paddingTop: S.md,
    paddingBottom: S.xxl,
    minHeight: SCREEN_H - HERO_H + 36,
    shadowColor: '#162359',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  // Con el teclado abierto el sheet no necesita estirarse a pantalla completa
  sheetCompact: {
    minHeight: 0,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: S.xl + 4,
  },
  sheetTitle: {
    fontSize: F.xxl,
    fontWeight: W.extra,
    color: C.text,
    letterSpacing: -0.5,
  },
  sheetSub: {
    fontSize: F.sm + 1,
    fontWeight: W.medium,
    color: C.textMuted,
    marginTop: S.xs + 1,
    marginBottom: S.lg + 4,
  },

  form: { gap: S.md + 2 },
  buttonWrap: { marginTop: S.sm },

  footer: {
    alignItems: 'center',
    marginTop: S.xxl + 4,
    gap: S.xs + 2,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    alignSelf: 'stretch',
    marginBottom: S.sm + 2,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  secureText: {
    fontSize: F.xs + 1,
    color: C.textFaint,
    fontWeight: W.medium,
  },
  version: {
    fontSize: F.xs,
    color: C.textFaint,
    fontWeight: W.medium,
    letterSpacing: 0.4,
    marginTop: 2,
  },
});

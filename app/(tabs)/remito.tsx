import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ColorBlock, EmptyState, ScreenHeader } from '@/components/ui';
import { useRouteStore } from '@/store/routeStore';
import { downloadRemito, openRemitoPdf } from '@/features/remito/services/remitoApi';
import { C, H, R, S, T } from '@/lib/theme';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function RemitoScreen() {
  const insets = useSafeAreaInsets();
  const { route } = useRouteStore();
  const routeId = route?.routeId ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    if (!routeId) return;
    setLoading(true);
    setError(null);
    try {
      const uri = await downloadRemito(routeId, todayStr());
      await openRemitoPdf(uri);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo obtener el remito.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Remito"
        subtitle={route ? `Reparto ${route.routeCode} · hoy` : 'Remito de salida'}
      />

      <ScrollView contentContainerStyle={styles.body}>
        {!routeId ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Sin reparto asignado"
            hint="Tu usuario no tiene un reparto cargado. Contactá al administrador."
          />
        ) : (
          <>
            {/* Salida = azul: el remito es del control de salida del reparto. */}
            <ColorBlock tone="blue" style={styles.block}>
              <View pointerEvents="none" style={styles.deco} />
              <View style={styles.iconCircle}>
                <Ionicons name="document-text-outline" size={30} color={C.blue} />
              </View>
              <View style={styles.texts}>
                <View style={styles.kicker}>
                  <Ionicons name="arrow-up" size={16} color={C.blueLight} />
                  <Text style={styles.kickerText}>Control de salida</Text>
                </View>
                <Text style={styles.title} accessibilityRole="header">Remito de hoy</Text>
                <Text style={styles.desc}>Se abre en el visor de PDF del teléfono.</Text>
              </View>
              <Pressable
                onPress={handleOpen}
                disabled={loading}
                accessibilityRole="button"
                accessibilityState={{ busy: loading }}
                style={({ pressed }) => [styles.btn, pressed && !loading && styles.pressed]}
              >
                {loading ? (
                  <ActivityIndicator color={C.navy} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={22} color={C.navy} />
                    <Text style={styles.btnText}>Ver remito de hoy</Text>
                  </>
                )}
              </Pressable>
            </ColorBlock>

            {error && (
              <View style={styles.notice}>
                <Ionicons name="time-outline" size={20} color={C.orangeText} />
                <Text style={styles.noticeText}>{error}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const DECO = 240;
const ICON = 60;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  body: { paddingHorizontal: S.gutter, paddingBottom: S.lg, gap: S.md, flexGrow: 1 },

  block: { overflow: 'hidden', gap: S.xl, padding: S.xl },
  deco: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: DECO,
    height: DECO,
    borderRadius: DECO / 2,
    backgroundColor: C.pillOnBlue,
  },
  iconCircle: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { gap: S.xs },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: S.xs + 2 },
  kickerText: { ...T.label, color: C.blueLight },
  title: { ...T.blockTitle, color: C.white },
  desc: { ...T.body, color: C.blueLight },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.md - 2,
    height: H.primaryButton,
    borderRadius: H.primaryButton / 2,
    backgroundColor: C.white,
  },
  pressed: { opacity: 0.85 },
  btnText: { ...T.button, color: C.navy },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    padding: S.lg,
    borderRadius: R.field,
    backgroundColor: C.orangeSoft,
  },
  noticeText: { ...T.body, color: C.orangeText, flex: 1 },
});

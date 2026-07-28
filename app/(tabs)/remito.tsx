import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeroHeader } from '@/components/HeroHeader';
import { useRouteStore } from '@/store/routeStore';
import { downloadRemito, openRemitoPdf } from '@/features/remito/services/remitoApi';
import { C, R, F, W, Shdw } from '@/lib/theme';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function RemitoScreen() {
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
    <View style={styles.screen}>
      <HeroHeader
        title="Remito"
        subtitle={route ? `Reparto ${route.routeCode} · hoy` : 'Remito de salida'}
      />

      <ScrollView contentContainerStyle={styles.body}>
        {!routeId ? (
          <View style={styles.stateBox}>
            <View style={[styles.stateIcon, { backgroundColor: C.warningLight }]}>
              <Ionicons name="alert-circle-outline" size={38} color={C.warning} />
            </View>
            <Text style={styles.stateTitle}>Sin reparto asignado</Text>
            <Text style={styles.stateSub}>
              Tu usuario no tiene un reparto cargado. Contactá al administrador.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <Ionicons name="document-text-outline" size={30} color={C.primary} />
              </View>
              <Text style={styles.title}>Remito de salida de hoy</Text>
              <Text style={styles.desc}>
                Abrí el remito del control de salida de tu reparto en el visor de PDF del teléfono.
              </Text>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleOpen}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={19} color="#fff" />
                    <Text style={styles.btnText}>Ver remito de hoy</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {error && (
              <View style={styles.notice}>
                <Ionicons name="time-outline" size={18} color={C.warning} />
                <Text style={styles.noticeText}>{error}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  body: { padding: 16, gap: 12 },

  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 22,
    alignItems: 'center',
    ...Shdw.card,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: R.full,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: F.lg, fontWeight: W.extra, color: C.text, textAlign: 'center' },
  desc: {
    fontSize: F.base,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 6,
    marginBottom: 18,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: C.primary,
    borderRadius: R.lg,
    height: 52,
    width: '100%',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: F.md, fontWeight: W.extra },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.warningLight,
    borderRadius: R.md,
    padding: 13,
  },
  noticeText: { flex: 1, fontSize: F.sm + 1, color: C.warning, fontWeight: W.semibold },

  stateBox: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 },
  stateIcon: {
    width: 78,
    height: 78,
    borderRadius: R.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stateTitle: { fontSize: F.lg, fontWeight: W.extra, color: C.text },
  stateSub: { fontSize: F.base, color: C.textMuted, textAlign: 'center', lineHeight: 21 },
});

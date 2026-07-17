import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { getLatestVersion } from '@/features/app-update/services/appUpdateApi';
import { downloadApk, installApk } from '@/features/app-update/services/apkInstaller';
import { isNewerVersion } from '@/features/app-update/utils';
import type { AppVersionInfo } from '@/features/app-update/types';
import { C, R, F, W, Shdw } from '@/lib/theme';

type Phase = 'prompt' | 'downloading' | 'installing' | 'error';

const CURRENT_VERSION = Constants.expoConfig?.version ?? '0.0.0';

/**
 * Chequea al arrancar si hay una versión más nueva y, si corresponde, muestra
 * un modal para descargar/instalar el APK. Si `mandatory`, no se puede saltar.
 * Falla en silencio si el endpoint no responde (no bloquea la app).
 */
export function AppUpdateGate() {
  const [info, setInfo] = useState<AppVersionInfo | null>(null);
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>('prompt');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const latest = await getLatestVersion();
        if (!active) return;
        if (isNewerVersion(latest.latestVersion, CURRENT_VERSION)) {
          setInfo(latest);
          setVisible(true);
        }
      } catch {
        // Sin endpoint o sin red → no mostramos nada, la app sigue normal.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleUpdate() {
    if (!info) return;
    try {
      setError(null);
      setProgress(0);
      setPhase('downloading');
      const uri = await downloadApk(info.apkUrl, setProgress);
      setPhase('installing');
      await installApk(uri);
      // A partir de acá toma el control el instalador del sistema.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar.');
      setPhase('error');
    }
  }

  function handleLater() {
    if (info?.mandatory) return;
    setVisible(false);
  }

  if (!info) return null;

  const pct = Math.round(progress * 100);
  const busy = phase === 'downloading' || phase === 'installing';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleLater}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="cloud-download" size={30} color={C.primary} />
          </View>

          <Text style={styles.title}>Actualización disponible</Text>
          <Text style={styles.versionLine}>
            Versión {info.latestVersion}
            <Text style={styles.versionCurrent}>  ·  tenés {CURRENT_VERSION}</Text>
          </Text>

          {info.mandatory && (
            <View style={styles.mandatoryChip}>
              <Ionicons name="lock-closed" size={11} color={C.warning} />
              <Text style={styles.mandatoryText}>Actualización obligatoria</Text>
            </View>
          )}

          {info.notes ? <Text style={styles.notes}>{info.notes}</Text> : null}

          {/* Progreso de descarga */}
          {phase === 'downloading' && (
            <View style={styles.progressBlock}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.progressText}>Descargando... {pct}%</Text>
            </View>
          )}

          {phase === 'installing' && (
            <View style={styles.installBlock}>
              <ActivityIndicator color={C.primary} />
              <Text style={styles.progressText}>Abriendo instalador...</Text>
            </View>
          )}

          {phase === 'error' && error ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning-outline" size={16} color={C.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Acciones */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryBtn, busy && styles.btnDisabled]}
              onPress={handleUpdate}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>
                    {phase === 'error' ? 'Reintentar' : 'Actualizar ahora'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {!info.mandatory && !busy && (
              <TouchableOpacity style={styles.laterBtn} onPress={handleLater} activeOpacity={0.7}>
                <Text style={styles.laterBtnText}>Después</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,17,30,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: 24,
    alignItems: 'center',
    ...Shdw.float,
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
  title: { fontSize: F.xl, fontWeight: W.extra, color: C.text, textAlign: 'center' },
  versionLine: { fontSize: F.base, fontWeight: W.bold, color: C.primary, marginTop: 4 },
  versionCurrent: { color: C.textMuted, fontWeight: W.medium },

  mandatoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.warningLight,
    borderRadius: R.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 12,
  },
  mandatoryText: { fontSize: F.xs, fontWeight: W.extra, color: C.warning, textTransform: 'uppercase' },

  notes: {
    fontSize: F.sm + 1,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 14,
  },

  progressBlock: { width: '100%', marginTop: 20, gap: 8 },
  progressTrack: {
    height: 8,
    borderRadius: R.full,
    backgroundColor: C.inputBg,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: R.full },
  progressText: { fontSize: F.sm, color: C.textMuted, fontWeight: W.semibold, textAlign: 'center' },

  installBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.dangerLight,
    borderRadius: R.md,
    padding: 12,
    marginTop: 18,
  },
  errorText: { flex: 1, fontSize: F.sm, color: C.danger, fontWeight: W.semibold },

  actions: { width: '100%', marginTop: 22, gap: 8 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: R.lg,
    height: 52,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: F.md, fontWeight: W.extra },
  laterBtn: { alignItems: 'center', paddingVertical: 12 },
  laterBtnText: { color: C.textMuted, fontSize: F.base, fontWeight: W.bold },
});

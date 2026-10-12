import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLatestVersion } from '@/features/app-update/services/appUpdateApi';
import { downloadApk, installApk } from '@/features/app-update/services/apkInstaller';
import { isNewerVersion, splitReleaseNotes } from '@/features/app-update/utils';
import { INSTALLED_VERSION } from '@/features/app-update/installedVersion';
import type { AppVersionInfo } from '@/features/app-update/types';
import { BottomSheet, PrimaryButton, SecondaryButton } from '@/components/ui';
import { C, R, S, T } from '@/lib/theme';

type Phase = 'prompt' | 'downloading' | 'installing' | 'error';

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
    // Sin versión instalada confiable no comparamos: mejor no avisar que avisar siempre.
    if (!INSTALLED_VERSION) return;

    let active = true;
    (async () => {
      try {
        const latest = await getLatestVersion();
        if (!active) return;
        if (isNewerVersion(latest.latestVersion, INSTALLED_VERSION)) {
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
  const noteLines = splitReleaseNotes(info.notes);

  return (
    <BottomSheet
      visible={visible}
      onDismiss={handleLater}
      icon="download-outline"
      tone="info"
      title="Actualización disponible"
      actions={
        <>
          <PrimaryButton
            title={phase === 'error' ? 'Reintentar' : 'Actualizar ahora'}
            icon={phase === 'error' ? 'refresh' : 'download-outline'}
            onPress={handleUpdate}
            loading={busy}
          />
          {!info.mandatory && !busy && <SecondaryButton title="Después" onPress={handleLater} />}
        </>
      }
    >
      <View style={styles.versionRow}>
        <View style={styles.versionPill}>
          <Text style={styles.versionPillText}>Versión {info.latestVersion}</Text>
        </View>
        <Text style={styles.versionCurrent}>tenés {INSTALLED_VERSION}</Text>
      </View>

      {info.mandatory && (
        <View style={styles.mandatoryChip}>
          <Ionicons name="lock-closed" size={13} color={C.orangeText} />
          <Text style={styles.mandatoryText}>Actualización obligatoria</Text>
        </View>
      )}

      {noteLines.length > 0 ? (
        <View style={styles.notes}>
          {noteLines.map((line, i) => (
            <View key={i} style={styles.noteRow}>
              <View style={styles.noteDot} />
              <Text style={styles.noteText}>{line}</Text>
            </View>
          ))}
        </View>
      ) : null}

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
          <ActivityIndicator color={C.navy} />
          <Text style={styles.progressText}>Abriendo instalador...</Text>
        </View>
      )}

      {phase === 'error' && error ? (
        <View style={styles.errorBox}>
          <Ionicons name="warning-outline" size={18} color={C.redText} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  versionRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: -S.sm },
  versionPill: {
    height: 32,
    paddingHorizontal: S.md,
    borderRadius: R.full,
    backgroundColor: C.blue,
    justifyContent: 'center',
  },
  versionPillText: { ...T.label, fontFamily: T.button.fontFamily, color: C.white, fontVariant: ['tabular-nums'] },
  versionCurrent: { ...T.label, fontFamily: T.secondary.fontFamily, color: C.ink2, fontVariant: ['tabular-nums'] },

  mandatoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: S.xs + 2,
    minHeight: 32,
    paddingHorizontal: S.md,
    borderRadius: R.full,
    backgroundColor: C.orangeSoft,
  },
  mandatoryText: { ...T.secondary, fontFamily: T.label.fontFamily, color: C.orangeText },

  notes: { gap: S.sm, padding: S.lg, borderRadius: R.field, backgroundColor: C.cream },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md - 2 },
  // Ring dot like the mockup: green fill with a navy edge.
  noteDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: C.navy,
    backgroundColor: C.green,
    marginTop: 4,
  },
  noteText: { ...T.body, color: C.navy, flex: 1 },

  progressBlock: { gap: S.sm },
  progressTrack: { height: 8, borderRadius: R.full, backgroundColor: C.cream, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.blue, borderRadius: R.full },
  progressText: { ...T.secondary, color: C.ink2, textAlign: 'center' },

  installBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.md - 2 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    padding: S.md,
    borderRadius: R.cell,
    backgroundColor: C.redSoft,
  },
  errorText: { ...T.secondary, color: C.redText, flex: 1 },
});

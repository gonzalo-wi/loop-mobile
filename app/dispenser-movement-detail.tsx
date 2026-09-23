import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getDispenserMovement,
  updateDispenserMovement,
  cancelDispenserMovement,
} from '@/features/dispensers/services/dispenserApi';
import { noNormalizadoPending, pollOdooStatus } from '@/features/dispensers/hooks/useOdooPolling';
import {
  expectsNoNormalizadoIntake,
  expectsOdooDispatch,
  getExcludedSerials,
  getExclusionNotice,
} from '@/features/dispensers/lib/movementOutcome';
import { HeroHeader } from '@/components/HeroHeader';
import { BarcodeScannerModal } from '@/features/dispensers/components/BarcodeScannerModal';
import type {
  DispenserMovement,
  DispenserMovementStatus,
  OdooStatus,
} from '@/features/dispensers/types';
import { C, R, S, F, W, Shdw } from '@/lib/theme';

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

const STATUS_INFO: Record<
  DispenserMovementStatus,
  { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  REGISTERED: { label: 'Registrado · enviando a Aguas', color: C.warning, bg: C.warningLight, icon: 'sync-outline' },
  SENT_TO_AGUAS: { label: 'Enviado a Aguas', color: C.entry, bg: C.entryLight, icon: 'checkmark-circle' },
  AGUAS_ERROR: { label: 'Error — reintentando', color: C.danger, bg: C.dangerLight, icon: 'alert-circle' },
  // Final: nunca cambia solo, así que sin ícono de "sincronizando".
  SKIPPED_UNREGISTERED: { label: 'No enviado a Aguas · todos excluidos', color: C.textSub, bg: C.inputBg, icon: 'ban-outline' },
  CANCELLED: { label: 'Cancelado', color: C.textMuted, bg: C.inputBg, icon: 'close-circle' },
};

// Derivación de no normalizados a Odoo — solo UNLOAD con excluidos.
const NO_NORMALIZADO_STATUS_INFO: Record<
  'PENDING' | 'SENT' | 'ERROR',
  { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  PENDING: { label: 'Derivando no normalizados a Odoo…', color: C.warning, bg: C.warningLight, icon: 'sync-outline' },
  SENT: { label: 'No normalizados en Odoo', color: C.odoo, bg: C.odooLight, icon: 'checkmark-circle' },
  ERROR: { label: 'Odoo rechazó los no normalizados · reintentando', color: C.danger, bg: C.dangerLight, icon: 'alert-circle' },
};

// Estado del envío a Odoo — banner independiente del de Aguas, solo para LOAD.
const ODOO_STATUS_INFO: Record<
  'PENDING' | 'SENT' | 'ERROR',
  { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  PENDING: { label: 'Enviando a Odoo…', color: C.warning, bg: C.warningLight, icon: 'sync-outline' },
  SENT: { label: 'Registrado en Odoo', color: C.odoo, bg: C.odooLight, icon: 'checkmark-circle' },
  ERROR: { label: 'Odoo rechazó la carga', color: C.danger, bg: C.dangerLight, icon: 'alert-circle' },
};

function odooStatusKey(status: OdooStatus): 'PENDING' | 'SENT' | 'ERROR' {
  if (status === 'SENT') return 'SENT';
  if (status === 'ERROR') return 'ERROR';
  return 'PENDING';
}

export default function DispenserMovementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mov, setMov] = useState<DispenserMovement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [routeCode, setRouteCode] = useState('');
  const [technician, setTechnician] = useState('');
  const [serials, setSerials] = useState<string[]>([]);
  const [manualSerial, setManualSerial] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadMov = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDispenserMovement(id);
      setMov(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el movimiento');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMov();
  }, [loadMov]);

  /**
   * Polling corto del estado de Odoo mientras siga pendiente (solo LOAD).
   * Corta apenas resuelve (`SENT`/`ERROR`) o se agota la ventana del helper.
   */
  const odooPollAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!mov || !expectsOdooDispatch(mov) || mov.odooStatus !== null) return;

    const controller = new AbortController();
    odooPollAbortRef.current = controller;

    pollOdooStatus(mov.id, { signal: controller.signal })
      .then((resolved) => {
        if (controller.signal.aborted) return;
        setMov(resolved);
      })
      .catch(() => {
        // AbortError esperado al desmontar/cambiar de movimiento.
      });

    return () => controller.abort();
    // Solo re-disparamos cuando cambia el id del movimiento (evita loop: el
    // polling ya actualiza `mov` con el estado resuelto).
  }, [mov?.id, mov?.type, mov?.status, mov?.odooStatus]);

  /** Mismo polling corto, para la derivación de no normalizados (UNLOAD con excluidos). */
  const awaitingNoNormalizado = mov ? expectsNoNormalizadoIntake(mov) && noNormalizadoPending(mov) : false;
  useEffect(() => {
    if (!mov || !awaitingNoNormalizado) return;

    const controller = new AbortController();
    pollOdooStatus(mov.id, { signal: controller.signal, isPending: noNormalizadoPending })
      .then((resolved) => {
        if (controller.signal.aborted) return;
        setMov(resolved);
      })
      .catch(() => {
        // AbortError esperado al desmontar/cambiar de movimiento.
      });

    return () => controller.abort();
  }, [mov?.id, awaitingNoNormalizado]);

  function startEdit() {
    if (!mov) return;
    setRouteCode(mov.routeCode);
    setTechnician(mov.technician);
    setSerials([...mov.serials]);
    setManualSerial('');
    setEditing(true);
  }

  const addSerial = useCallback((code: string) => {
    const clean = code.trim();
    if (!clean) return;
    setSerials((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
  }, []);

  function handleAddManual() {
    const clean = manualSerial.trim();
    if (!clean) return;
    addSerial(clean);
    setManualSerial('');
  }

  function removeSerial(code: string) {
    setSerials((prev) => prev.filter((s) => s !== code));
  }

  const canSave =
    routeCode.trim().length > 0 && technician.trim().length > 0 && serials.length > 0 && !saving;

  async function handleSave() {
    if (!mov) return;
    setSaving(true);
    try {
      const updated = await updateDispenserMovement(mov.id, {
        type: mov.type,
        routeCode: routeCode.trim(),
        technician: technician.trim(),
        locationId: mov.locationId,
        stateId: mov.stateId,
        movementDate: mov.movementDate,
        serials,
      });
      // PUT crea un movimiento nuevo (nuevo id) y revalida los excluidos → volvemos a la lista.
      const notice = getExclusionNotice(updated);
      const baseMessage =
        updated.status === 'SKIPPED_UNREGISTERED'
          ? 'Se registró la corrección, pero no se envió a Aguas.'
          : 'Se registró la corrección y se reenvió a Aguas.';
      Alert.alert('Corregido', notice ? `${baseMessage}\n\n${notice.message}` : baseMessage, [
        { text: 'OK', onPress: () => router.back() },
      ]);
      setMov(updated);
      setEditing(false);
    } catch (e) {
      Alert.alert('No se pudo corregir', e instanceof Error ? e.message : 'Intentá de nuevo');
    } finally {
      setSaving(false);
    }
  }

  function confirmCancel() {
    if (!mov) return;
    Alert.alert(
      'Cancelar movimiento',
      `Se va a cancelar el movimiento del reparto ${mov.routeCode} (${mov.serials.length} dispensers). Si ya se envió a Aguas, también se elimina allá.`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: doCancel },
      ],
    );
  }

  async function doCancel() {
    if (!mov) return;
    setCancelling(true);
    try {
      await cancelDispenserMovement(mov.id);
      Alert.alert('Cancelado', 'El movimiento fue cancelado.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('No se pudo cancelar', e instanceof Error ? e.message : 'Intentá de nuevo');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <HeroHeader title="Movimiento" onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </View>
    );
  }

  if (error || !mov) {
    return (
      <View style={styles.screen}>
        <HeroHeader title="Movimiento" onBack={() => router.back()} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'Movimiento no encontrado'}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isLoad = mov.type === 'LOAD';
  const status = STATUS_INFO[mov.status] ?? STATUS_INFO.REGISTERED;
  const isCancelled = mov.status === 'CANCELLED';
  const displaySerials = editing ? serials : mov.serials;
  // Al editar, la lista es la nueva: el backend revalida los excluidos en el PUT.
  const excludedSet = new Set(editing ? [] : getExcludedSerials(mov));
  // Odoo es independiente de Aguas: un movimiento puede estar SENT_TO_AGUAS y odooStatus=ERROR.
  const odooStatus = expectsOdooDispatch(mov) ? ODOO_STATUS_INFO[odooStatusKey(mov.odooStatus)] : null;
  const noNormalizadoStatus = expectsNoNormalizadoIntake(mov)
    ? NO_NORMALIZADO_STATUS_INFO[odooStatusKey(mov.odooNoNormalizadoStatus ?? null)]
    : null;
  const excludedTag = isLoad ? 'No disponible en Odoo · no enviado' : 'No normalizado · derivado a Odoo';

  return (
    <View style={styles.screen}>
      <HeroHeader
        title={`Reparto ${mov.routeCode}`}
        subtitle={isLoad ? 'Carga al camión' : 'Descarga del camión'}
        color={isLoad ? C.exit : C.entry}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Estados por sistema: Aguas y Odoo son integraciones independientes. */}
        <View style={styles.statusGroup}>
          <Text style={styles.statusGroupLabel}>Estado por sistema</Text>

          {/* Estado Aguas */}
          <View style={[styles.statusBanner, { backgroundColor: status.bg }]}>
            <View style={styles.systemTag}>
              <Ionicons name="water" size={11} color={C.textStrong} />
              <Text style={styles.systemTagText}>AGUAS</Text>
            </View>
            <View style={styles.statusBannerRow}>
              <Ionicons name={status.icon} size={19} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          {/* Estado Odoo — independiente del de Aguas, solo LOAD */}
          {odooStatus && (
            <View
              style={[
                styles.statusBanner,
                styles.odooBanner,
                { backgroundColor: odooStatus.bg, borderLeftColor: odooStatus.color },
              ]}
            >
              <View style={[styles.systemTag, styles.systemTagOdoo]}>
                <Ionicons name="cube" size={11} color="#fff" />
                <Text style={[styles.systemTagText, styles.systemTagTextOdoo]}>ODOO</Text>
              </View>
              <View style={styles.statusBannerRow}>
                <Ionicons name={odooStatus.icon} size={19} color={odooStatus.color} />
                <View style={styles.odooStatusBody}>
                  <Text style={[styles.statusText, { color: odooStatus.color }]}>{odooStatus.label}</Text>
                  {mov.odooStatus === 'SENT' && mov.odooPickingName ? (
                    <Text style={[styles.odooStatusSub, { color: odooStatus.color }]} numberOfLines={1}>
                      Comprobante: {mov.odooPickingName}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          )}

          {/* Derivación de no normalizados — independiente de Aguas y de reparación, solo UNLOAD */}
          {noNormalizadoStatus && (
            <View
              style={[
                styles.statusBanner,
                styles.odooBanner,
                { backgroundColor: noNormalizadoStatus.bg, borderLeftColor: noNormalizadoStatus.color },
              ]}
            >
              <View style={[styles.systemTag, styles.systemTagOdoo]}>
                <Ionicons name="cube" size={11} color={C.surface} />
                <Text style={[styles.systemTagText, styles.systemTagTextOdoo]}>ODOO · NO NORMALIZADOS</Text>
              </View>
              <View style={styles.statusBannerRow}>
                <Ionicons name={noNormalizadoStatus.icon} size={19} color={noNormalizadoStatus.color} />
                <View style={styles.odooStatusBody}>
                  <Text style={[styles.statusText, { color: noNormalizadoStatus.color }]}>
                    {noNormalizadoStatus.label}
                  </Text>
                  {mov.odooNoNormalizadoStatus === 'SENT' && mov.odooNoNormalizadoPickingName ? (
                    <Text style={[styles.odooStatusSub, { color: noNormalizadoStatus.color }]} numberOfLines={1}>
                      Comprobante: {mov.odooNoNormalizadoPickingName}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Datos */}
        <View style={styles.card}>
          {editing ? (
            <>
              <Text style={styles.fieldLabel}>Reparto</Text>
              <TextInput
                style={styles.input}
                value={routeCode}
                onChangeText={setRouteCode}
                keyboardType="number-pad"
                placeholder="Reparto"
                placeholderTextColor={C.textFaint}
              />
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Técnico</Text>
              <TextInput
                style={styles.input}
                value={technician}
                onChangeText={setTechnician}
                autoCapitalize="characters"
                placeholder="Técnico"
                placeholderTextColor={C.textFaint}
              />
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={17} color={C.textMuted} />
                <Text style={styles.infoText}>{mov.technician}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={17} color={C.textMuted} />
                <Text style={styles.infoText}>{formatDate(mov.movementDate)}</Text>
              </View>
              {mov.registeredByUsername ? (
                <View style={styles.infoRow}>
                  <Ionicons name="id-card-outline" size={17} color={C.textMuted} />
                  <Text style={styles.infoText}>Registró: {mov.registeredByUsername}</Text>
                </View>
              ) : null}
              {isLoad && mov.odooPickingName ? (
                <View style={styles.infoRow}>
                  <Ionicons name="receipt-outline" size={17} color={C.odoo} />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoTextMuted}>Odoo · </Text>
                    {mov.odooPickingName}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </View>

        {/* Serials */}
        <View style={styles.serialsHeader}>
          <Text style={styles.sectionLabel}>Dispensers</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{displaySerials.length}</Text>
          </View>
        </View>

        {editing && (
          <>
            <TouchableOpacity style={styles.scanBtn} onPress={() => setShowScanner(true)} activeOpacity={0.9}>
              <Ionicons name="barcode-outline" size={20} color="#fff" />
              <Text style={styles.scanBtnText}>Escanear más</Text>
            </TouchableOpacity>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                value={manualSerial}
                onChangeText={setManualSerial}
                placeholder="Agregar serial a mano"
                placeholderTextColor={C.textFaint}
                autoCapitalize="characters"
                autoCorrect={false}
                onSubmitEditing={handleAddManual}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.manualAdd, !manualSerial.trim() && styles.manualAddDisabled]}
                onPress={handleAddManual}
                disabled={!manualSerial.trim()}
              >
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.serialsCard}>
          {displaySerials.length === 0 ? (
            <Text style={styles.noSerials}>Sin dispensers</Text>
          ) : (
            displaySerials.map((code, i) => {
              const excluded = excludedSet.has(code);
              return (
              <View key={code} style={[styles.serialRow, i > 0 && styles.serialRowBorder]}>
                <View style={[styles.serialIndex, excluded && styles.serialIndexExcluded]}>
                  {excluded ? (
                    <Ionicons name="alert" size={14} color={C.warning} />
                  ) : (
                    <Text style={styles.serialIndexText}>{i + 1}</Text>
                  )}
                </View>
                <View style={styles.serialBody}>
                  <Text style={[styles.serialText, excluded && styles.serialTextExcluded]} numberOfLines={1}>
                    {code}
                  </Text>
                  {excluded && (
                    <Text style={styles.serialExcludedTag} numberOfLines={1}>{excludedTag}</Text>
                  )}
                </View>
                {editing && (
                  <TouchableOpacity
                    onPress={() => removeSerial(code)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={22} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Barra de acciones */}
      {!isCancelled && (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          {editing ? (
            <>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setEditing(false)}
                disabled={saving}
              >
                <Text style={styles.secondaryBtnText}>Descartar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, !canSave && styles.btnDisabled]}
                onPress={handleSave}
                disabled={!canSave}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Guardar correcciones</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={confirmCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator color={C.danger} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color={C.danger} />
                    <Text style={styles.dangerBtnText}>Cancelar</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={startEdit}>
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Corregir</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <BarcodeScannerModal
        visible={showScanner}
        existingSerials={serials}
        onAdd={addSerial}
        onClose={() => setShowScanner(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: C.danger, fontSize: F.base, textAlign: 'center', marginBottom: 14 },
  retryBtn: { paddingHorizontal: 22, paddingVertical: 10, backgroundColor: C.primary, borderRadius: R.md },
  retryText: { color: '#fff', fontSize: F.base, fontWeight: W.bold },

  statusGroup: { gap: S.sm },
  statusGroupLabel: {
    fontSize: F.xs + 1,
    fontWeight: W.extra,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statusBanner: {
    gap: S.sm,
    borderRadius: R.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  odooBanner: {
    borderLeftWidth: 3,
  },
  statusBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm + 2,
  },
  statusText: { fontSize: F.base, fontWeight: W.bold, flex: 1 },
  odooStatusBody: { flex: 1 },
  odooStatusSub: { fontSize: F.sm, fontWeight: W.semibold, marginTop: 2, opacity: 0.85 },

  systemTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(14,23,38,0.08)',
    borderRadius: R.xs,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  systemTagText: {
    fontSize: 9,
    fontWeight: W.extra,
    color: C.textStrong,
    letterSpacing: 0.5,
  },
  systemTagOdoo: { backgroundColor: C.odoo },
  systemTagTextOdoo: { color: '#fff' },

  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 16,
    gap: 10,
    ...Shdw.card,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: F.base, color: C.text, fontWeight: W.semibold },
  infoTextMuted: { color: C.textMuted, fontWeight: W.medium },
  fieldLabel: {
    fontSize: F.xs,
    color: C.textMuted,
    fontWeight: W.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.inputBg,
    borderRadius: R.md,
    paddingHorizontal: 14,
    height: 50,
    fontSize: F.md,
    fontWeight: W.semibold,
    color: C.text,
  },

  serialsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sectionLabel: {
    fontSize: F.xs + 1,
    fontWeight: W.extra,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  countPill: {
    backgroundColor: C.primaryLight,
    borderRadius: R.full,
    paddingHorizontal: 9,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countPillText: { fontSize: F.sm, fontWeight: W.extra, color: C.primary },

  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: R.md,
    paddingVertical: 13,
  },
  scanBtnText: { color: '#fff', fontSize: F.base, fontWeight: W.extra },
  manualRow: { flexDirection: 'row', gap: 8 },
  manualInput: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    height: 46,
    fontSize: F.base,
    color: C.text,
  },
  manualAdd: {
    width: 46,
    height: 46,
    borderRadius: R.md,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualAddDisabled: { backgroundColor: C.borderStrong },

  serialsCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingHorizontal: 14,
    ...Shdw.card,
  },
  noSerials: { color: C.textMuted, fontSize: F.base, textAlign: 'center', paddingVertical: 20 },
  serialRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  serialRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  serialIndex: {
    width: 26,
    height: 26,
    borderRadius: R.full,
    backgroundColor: C.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serialIndexText: { fontSize: F.xs, fontWeight: W.extra, color: C.textSub },
  serialBody: { flex: 1 },
  serialText: { fontSize: F.base, fontWeight: W.semibold, color: C.text },
  // Excluido por el backend (no normalizado en UNLOAD / no disponible en Odoo en LOAD).
  serialIndexExcluded: { backgroundColor: C.warningLight },
  serialTextExcluded: { color: C.textSub },
  serialExcludedTag: { fontSize: F.xs, fontWeight: W.bold, color: C.warning, marginTop: 1 },

  actionBar: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: R.lg,
    height: 52,
  },
  primaryBtnText: { color: '#fff', fontSize: F.md, fontWeight: W.extra },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceSunken,
    borderRadius: R.lg,
    height: 52,
    borderWidth: 1,
    borderColor: C.border,
  },
  secondaryBtnText: { color: C.textSub, fontSize: F.md, fontWeight: W.bold },
  dangerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.dangerLight,
    borderRadius: R.lg,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.25)',
  },
  dangerBtnText: { color: C.danger, fontSize: F.md, fontWeight: W.extra },
  btnDisabled: { backgroundColor: C.borderStrong, opacity: 0.9 },
});

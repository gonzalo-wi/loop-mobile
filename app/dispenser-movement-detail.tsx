import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getDispenserMovement,
  updateDispenserMovement,
  cancelDispenserMovement,
} from '@/features/dispensers/services/dispenserApi';
import { noNormalizadoPending, pollOdooStatus } from '@/features/dispensers/hooks/useOdooPolling';
import { sanitizeSerial } from '@/features/dispensers/services/dispenserValidationApi';
import {
  expectsNoNormalizadoIntake,
  expectsOdooDispatch,
  getExcludedSerials,
  getExclusionNotice,
} from '@/features/dispensers/lib/movementOutcome';
import {
  AppTextField,
  BottomBar,
  EmptyState,
  Pill,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
  TextEntrySheet,
} from '@/components/ui';
import { BarcodeScannerModal } from '@/features/dispensers/components/BarcodeScannerModal';
import { DetailSerialList } from '@/features/dispensers/components/DetailSerialList';
import { SystemStatusBlock } from '@/features/dispensers/components/SystemStatusBlock';
import { getSystemStatusBlocks } from '@/features/dispensers/lib/systemStatusBlocks';
import { baggedAmong, toggleCode } from '@/features/dispensers/lib/bagged';
import type { DispenserMovement } from '@/features/dispensers/types';
import { C, H, R, S, T } from '@/lib/theme';
import { isoDateToDisplay } from '@/lib/dateFormat';

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
  const [bagged, setBagged] = useState<string[]>([]);
  const [manualSerial, setManualSerial] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showManualSheet, setShowManualSheet] = useState(false);

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
    setBagged([...(mov.baggedSerials ?? [])]);
    setManualSerial('');
    setEditing(true);
  }

  const addSerial = useCallback((code: string) => {
    // deja solo [A-Za-z0-9.*-] en mayúsculas (si no, no machea contra Aguas/Odoo).
    const clean = sanitizeSerial(code);
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
    // Si se vuelve a agregar, que no reaparezca marcada sin que el operario la toque.
    setBagged((prev) => prev.filter((c) => c !== code));
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
        // El PUT recrea el movimiento: sin esto se perderían las marcas de embolsado.
        baggedSerials: baggedAmong(mov.type, serials, bagged),
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

  const header = (title: string, right?: ReactNode) => (
    <ScreenHeader title={title} onBack={() => router.back()} right={right} />
  );

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {header('Movimiento')}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      </View>
    );
  }

  if (error || !mov) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {header('Movimiento')}
        <View style={styles.centered}>
          <EmptyState icon="alert-circle-outline" title="No se pudo abrir el movimiento" hint={error ?? 'Movimiento no encontrado'} />
          <View style={styles.retryWrap}>
            <SecondaryButton title="Volver" icon="chevron-back" onPress={() => router.back()} />
          </View>
        </View>
      </View>
    );
  }

  const isLoad = mov.type === 'LOAD';
  const isCancelled = mov.status === 'CANCELLED';
  const displaySerials = editing ? serials : mov.serials;
  const displayBagged = editing ? bagged : (mov.baggedSerials ?? []);
  // Al editar, la lista es la nueva: el backend revalida los excluidos en el PUT.
  const excluded = editing ? [] : getExcludedSerials(mov);
  const statusBlocks = getSystemStatusBlocks(mov);
  const excludedTitle = isLoad ? 'No disponibles en Odoo · no enviados' : 'No normalizados · derivados a Odoo';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {header(
        `Reparto ${mov.routeCode}`,
        <Pill
          label={isLoad ? 'Carga al camión' : 'Descarga del camión'}
          icon={isLoad ? 'arrow-up' : 'arrow-down'}
          tone={isLoad ? 'blue' : 'green'}
        />,
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: (isCancelled ? S.xxl : BOTTOM_BAR_SPACE) + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Aguas y Odoo son integraciones independientes: cada una con su estado. */}
        <Text style={styles.groupLabel}>Estado por sistema</Text>
        <View style={styles.blocks}>
          {statusBlocks.map((block) => (
            <SystemStatusBlock key={block.tag} block={block} />
          ))}
        </View>

        {editing ? (
          <View style={styles.editCard}>
            <AppTextField
              label="Reparto"
              value={routeCode}
              onChangeText={setRouteCode}
              keyboardType="number-pad"
              placeholder="Reparto"
              surface="cream"
            />
            <AppTextField
              label="Técnico"
              value={technician}
              onChangeText={setTechnician}
              autoCapitalize="characters"
              placeholder="Técnico"
              surface="cream"
            />
          </View>
        ) : (
          <View style={styles.pills}>
            <Pill label={mov.technician} icon="person-outline" />
            <Pill label={isoDateToDisplay(mov.movementDate)} icon="calendar-outline" />
            {mov.registeredByUsername ? (
              <Pill label={`Registró: ${mov.registeredByUsername}`} icon="phone-portrait-outline" />
            ) : null}
          </View>
        )}

        <View style={styles.serialsHeader}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Dispensers</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{displaySerials.length}</Text>
          </View>
          <View style={styles.flex} />
          {editing && (
            <>
              <Pill label="Escanear" icon="barcode-outline" onPress={() => setShowScanner(true)} />
              <Pill label="A mano" icon="add" onPress={() => setShowManualSheet(true)} />
            </>
          )}
        </View>

        <DetailSerialList
          serials={displaySerials}
          excluded={excluded}
          excludedTitle={excludedTitle}
          bagged={
            isLoad
              ? undefined
              : {
                  codes: displayBagged,
                  onToggle: editing ? (code) => setBagged((prev) => toggleCode(prev, code)) : undefined,
                }
          }
          onRemove={editing ? removeSerial : undefined}
        />
      </ScrollView>

      {!isCancelled && (
        <BottomBar>
          {editing ? (
            <>
              <View style={styles.secondaryAction}>
                <SecondaryButton title="Descartar" onPress={() => setEditing(false)} disabled={saving} />
              </View>
              <View style={styles.flex}>
                <PrimaryButton
                  title="Guardar correcciones"
                  onPress={handleSave}
                  loading={saving}
                  disabled={!canSave}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.secondaryAction}>
                <SecondaryButton
                  title="Cancelar"
                  icon="trash-outline"
                  tone="destructive"
                  onPress={confirmCancel}
                  loading={cancelling}
                />
              </View>
              <View style={styles.flex}>
                <PrimaryButton title="Corregir" icon="create-outline" onPress={startEdit} />
              </View>
            </>
          )}
        </BottomBar>
      )}

      <TextEntrySheet
        visible={showManualSheet}
        onClose={() => {
          setShowManualSheet(false);
          setManualSerial('');
        }}
        title="Agregar serial a mano"
        label="Serial del dispenser"
        placeholder="Escribí el serial"
        fieldIcon="create-outline"
        value={manualSerial}
        onChangeText={setManualSerial}
        onSubmit={handleAddManual}
        submitLabel="Agregar"
        submitIcon="add"
        canSubmit={manualSerial.trim().length > 0}
        inputProps={{ autoCapitalize: 'characters', autoCorrect: false }}
      />

      <BarcodeScannerModal
        visible={showScanner}
        existingSerials={serials}
        onAdd={addSerial}
        onClose={() => setShowScanner(false)}
      />
    </View>
  );
}

// Primary button (60) + vertical padding of the bottom bar, so the last row isn't hidden.
const BOTTOM_BAR_SPACE = H.primaryButton + S.md * 2 + S.lg;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: S.gutter, gap: S.md },
  centered: { flex: 1, justifyContent: 'center', padding: S.gutter, gap: S.lg },
  retryWrap: { alignSelf: 'center' },

  groupLabel: { ...T.label, color: C.ink2, paddingLeft: S.sm - 2 },
  blocks: { flexDirection: 'row', gap: S.md },

  editCard: { gap: S.md, padding: S.lg, borderRadius: R.card, backgroundColor: C.white },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },

  serialsHeader: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.sm },
  sectionTitle: { ...T.section, color: C.navy },
  countPill: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: S.sm,
    borderRadius: 12,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillText: { ...T.secondary, fontFamily: T.button.fontFamily, color: C.white, fontVariant: ['tabular-nums'] },

  // The destructive/secondary action is always narrower than the primary one.
  secondaryAction: { flex: 0.75 },
});

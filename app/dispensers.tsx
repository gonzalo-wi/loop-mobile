import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import {
  BottomBar,
  BottomSheet,
  CircleButton,
  EmptyState,
  Pill,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
  StatusOverlay,
  TextEntrySheet,
  type OverlayStatus,
} from '@/components/ui';
import { DatePickerModal } from '@/features/stock-controls/components/DatePickerModal';
import { BarcodeScannerModal } from '@/features/dispensers/components/BarcodeScannerModal';
import { MovementDataBlock } from '@/features/dispensers/components/MovementDataBlock';
import { SerialRow } from '@/features/dispensers/components/SerialRow';
import { MovementRegisteredScreen } from '@/features/dispensers/components/MovementRegisteredScreen';
import { findActiveMovement, getSubmitFailureCopy } from '@/features/dispensers/lib/submitFailure';
import { ApiError } from '@/lib/api';
import { getSerialRowStatus } from '@/features/dispensers/lib/serialRowStatus';
import { toShortDisplayDate } from '@/features/dispensers/lib/displayDate';
import {
  getAguasLocations,
  getAguasStates,
  createDispenserMovement,
  getDispenserMovements,
} from '@/features/dispensers/services/dispenserApi';
import {
  getUnregisteredSerials,
  normalizeSerial,
  sanitizeSerial,
} from '@/features/dispensers/services/dispenserValidationApi';
import {
  validateOdooEquipment,
} from '@/features/dispensers/services/odooApi';
import { pollOdooStatus } from '@/features/dispensers/hooks/useOdooPolling';
import { shouldSendSerial } from '@/features/dispensers/lib/movementOutcome';
import { isAwaitingSystems } from '@/features/dispensers/lib/registrationFollowUp';
import { baggedSerialsToSend, toggleBagged } from '@/features/dispensers/lib/bagged';
import type {
  AguasCatalog,
  AguasCatalogItem,
  DispenserMovement,
  DispenserMovementType,
  OdooValidationResult,
} from '@/features/dispensers/types';
import { C, H, R, S, T } from '@/lib/theme';

// Debounce para no spammear la validación Odoo mientras se escanea en tanda.
const ODOO_VALIDATE_DEBOUNCE_MS = 900;

type SubmitFailure =
  | { kind: 'failed'; title: string; message: string }
  | { kind: 'duplicate'; message: string; movementId: string };

type SerialSource = 'scan' | 'manual';
/**
 * `valid: false` = no registrado (no normalizado) según jMobile.
 * LOAD: se muestra en rojo y NO se envía. UNLOAD: se envía igual y el backend lo deriva a la
 * ubicación de no normalizados en Odoo (ver `shouldSendSerial`).
 * `bagged` = volvió embolsado (solo se ofrece y se envía en UNLOAD).
 */
type SerialEntry = { code: string; source: SerialSource; valid: boolean; bagged: boolean };

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}


// Defaults de ubicación/estado por tipo (los mismos que aplica el backend).
const DEFAULT_IDS: Record<DispenserMovementType, { location: number; state: number }> = {
  LOAD: { location: 2, state: 2 }, // EN CAMIONETA · OPERATIVO
  UNLOAD: { location: 49, state: 4 }, // PLANTA BAJA · EN REPARACION
};

/**
 * Fecha sugerida según el tipo:
 * - LOAD (carga): día siguiente. Si cae domingo → salta a lunes.
 * - UNLOAD (descarga): hoy.
 * El usuario puede sobrescribirla y queda fija (ver `dateTouched`).
 */
function defaultDateForType(type: DispenserMovementType): Date {
  const d = new Date();
  if (type === 'LOAD') {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1); // domingo → lunes
  }
  return d;
}

export default function DispensersScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState<DispenserMovementType>('LOAD');
  const [routeCode, setRouteCode] = useState('');
  const [technician, setTechnician] = useState(user?.name ?? '');
  const [movementDate, setMovementDate] = useState<Date>(() => defaultDateForType('LOAD'));
  // Si el usuario elige una fecha a mano, no la volvemos a recalcular.
  const [dateTouched, setDateTouched] = useState(false);
  const [serials, setSerials] = useState<SerialEntry[]>([]);
  const [manualSerial, setManualSerial] = useState('');

  const [locations, setLocations] = useState<AguasCatalog | null>(null);
  const [states, setStates] = useState<AguasCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [location, setLocation] = useState<AguasCatalogItem | null>(null);
  const [movState, setMovState] = useState<AguasCatalogItem | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showManualSheet, setShowManualSheet] = useState(false);
  const [showTechnicianSheet, setShowTechnicianSheet] = useState(false);

  // Seriales no normalizados del día según jMobile (ver `shouldSendSerial` para qué se envía).
  const [invalidSerials, setInvalidSerials] = useState<Set<string>>(new Set());

  // Pull-to-refresh de los seriales no normalizados.
  const [refreshing, setRefreshing] = useState(false);

  // Validación Odoo de series agregadas (independiente de la de Aguas).
  const [odooValidation, setOdooValidation] = useState<Map<string, OdooValidationResult>>(
    new Map(),
  );
  const odooValidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState<DispenserMovement | null>(null);
  // Id of the registered movement still being followed (Aguas/Odoo pending).
  const [followingId, setFollowingId] = useState<string | null>(null);
  const [submitFailure, setSubmitFailure] = useState<SubmitFailure | null>(null);
  const [overlay, setOverlay] = useState<{
    visible: boolean;
    status: OverlayStatus;
    title?: string;
    message?: string;
  }>({ visible: false, status: 'loading' });

  const loadCatalogs = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const [loc, sta] = await Promise.all([getAguasLocations(), getAguasStates()]);
      setLocations(loc);
      setStates(sta);
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : 'Error al cargar catálogos de Aguas');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  /**
   * Refresca la lista de seriales no normalizados en jMobile (del día de hoy).
   * Si falla, dejamos la lista como está: preferimos no bloquear la carga.
   * La carga inicial (al montar) queda a cargo del `useFocusEffect` de abajo.
   */
  const refreshInvalidSerials = useCallback(async () => {
    try {
      const set = await getUnregisteredSerials(toDateString(new Date()));
      setInvalidSerials(set);
    } catch {
      // Sin conexión con Aguas → no validamos (no bloqueamos el trabajo).
    }
  }, []);

  /**
   * Al enfocar la pantalla (montaje inicial o volver a ella) traemos la lista
   * fresca de seriales no normalizados en jMobile, sin depender de un re-montaje.
   */
  useFocusEffect(
    useCallback(() => {
      refreshInvalidSerials();
    }, [refreshInvalidSerials]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshInvalidSerials();
    } finally {
      setRefreshing(false);
    }
  }, [refreshInvalidSerials]);

  // Al cargar catálogos o cambiar de tipo, pre-selecciona el default de ese tipo.
  useEffect(() => {
    if (!locations || !states) return;
    const key = type === 'LOAD' ? 'salida_camion' : 'vuelta_camion';
    const def = DEFAULT_IDS[type];
    const locOpts = locations[key] ?? [];
    const staOpts = states[key] ?? [];
    setLocation(locOpts.find((o) => o.id === def.location) ?? locOpts[0] ?? null);
    setMovState(staOpts.find((o) => o.id === def.state) ?? staOpts[0] ?? null);
  }, [type, locations, states]);

  // Fecha sugerida según el tipo, salvo que el usuario ya la haya fijado a mano.
  useEffect(() => {
    if (!dateTouched) setMovementDate(defaultDateForType(type));
  }, [type, dateTouched]);

  const serialCodes = serials.map((s) => s.code);
  const sendableSerials = serials.filter((s) => shouldSendSerial(type, s.valid));
  const invalidCount = serials.filter((s) => !s.valid).length;
  const baggedCount = baggedSerialsToSend(type, sendableSerials).length;
  // Series marcadas por Odoo como no disponibles (aviso independiente del de Aguas).
  const odooUnavailableCount = serials.filter((s) => {
    const result = odooValidation.get(s.code);
    return result ? !result.disponible : false;
  }).length;

  const addSerial = useCallback((code: string, source: SerialSource) => {
    // deja solo [A-Za-z0-9.*-] en mayúsculas (si no, no machea contra Aguas/Odoo).
    const clean = sanitizeSerial(code);
    if (!clean) return;
    // Los no normalizados (jMobile) se agregan igual, marcados; si se envían depende del tipo.
    const valid = !invalidSerials.has(normalizeSerial(clean));
    setSerials((prev) =>
      prev.some((s) => s.code === clean) ? prev : [...prev, { code: clean, source, valid, bagged: false }],
    );
  }, [invalidSerials]);

  const addScanned = useCallback((code: string) => addSerial(code, 'scan'), [addSerial]);

  function handleAddManual() {
    const clean = manualSerial.trim();
    if (!clean) return;
    addSerial(clean, 'manual');
    setManualSerial('');
  }

  function removeSerial(code: string) {
    setSerials((prev) => prev.filter((s) => s.code !== code));
  }

  function handleToggleBagged(code: string) {
    setSerials((prev) => toggleBagged(prev, code));
  }

  function clearSerials() {
    setSerials([]);
  }

  /**
   * Validación Odoo de las series agregadas (independiente de la de Aguas).
   * Se dispara en batch con debounce para no spammear el endpoint mientras
   * se escanea la tanda. Solo aplica a LOAD; no bloquea el submit, solo avisa.
   */
  useEffect(() => {
    if (type !== 'LOAD') return;
    if (odooValidateTimer.current) clearTimeout(odooValidateTimer.current);

    if (serialCodes.length === 0) {
      setOdooValidation(new Map());
      return;
    }

    odooValidateTimer.current = setTimeout(async () => {
      try {
        const results = await validateOdooEquipment(serialCodes);
        setOdooValidation(new Map(results.map((r) => [r.serie, r])));
      } catch {
        // Sin conexión con Odoo → no avisamos, pero tampoco bloqueamos.
      }
    }, ODOO_VALIDATE_DEBOUNCE_MS);

    return () => {
      if (odooValidateTimer.current) clearTimeout(odooValidateTimer.current);
    };
  }, [serialCodes.join(','), type]);

  const canSubmit =
    routeCode.trim().length > 0 &&
    technician.trim().length > 0 &&
    sendableSerials.length > 0 &&
    !submitting;

  async function handleSubmit() {
    if (submitting) return;
    setSubmitFailure(null);
    setSubmitting(true);
    setOverlay({ visible: true, status: 'loading', title: 'Registrando movimiento...' });
    const key = { type, routeCode: routeCode.trim(), movementDate: toDateString(movementDate) };
    try {
      const created = await createDispenserMovement({
        type,
        routeCode: key.routeCode,
        technician: technician.trim(),
        locationId: location?.id,
        stateId: movState?.id,
        movementDate: key.movementDate,
        serials: sendableSerials.map((s) => s.code),
        baggedSerials: baggedSerialsToSend(type, sendableSerials),
      });

      // The confirmation screen stays until the operator chooses what's next,
      // so the form can be cleared right away behind it.
      setOverlay((o) => ({ ...o, visible: false }));
      setRegistered(created);
      setRouteCode('');
      setSerials([]);

      // Follow Aguas/Odoo for a short window so the confirmation shows their answer.
      if (isAwaitingSystems(created)) {
        setFollowingId(created.id);
        pollOdooStatus(created.id, { isPending: isAwaitingSystems })
          .then((resolved) => {
            setRegistered((current) => (current?.id === resolved.id ? resolved : current));
          })
          .catch(() => {
            // Si falla la reconsulta, no molestamos: el estado se puede ver en Movimientos.
          })
          .finally(() => {
            setFollowingId((current) => (current === created.id ? null : current));
          });
      }
    } catch (e) {
      const error = e instanceof ApiError ? e : { message: e instanceof Error ? e.message : undefined };
      const status = e instanceof ApiError ? e.status : undefined;

      // When the server rejected it, look for the movement it collides with,
      // so the panel can take the operator there instead of creating another one.
      let existing: DispenserMovement | null = null;
      if (status !== undefined) {
        setOverlay({ visible: true, status: 'loading', title: 'Verificando...' });
        try {
          const { movements } = await getDispenserMovements({
            type: key.type,
            routeCode: key.routeCode,
            from: key.movementDate,
            to: key.movementDate,
            size: 20,
          });
          existing = findActiveMovement(movements, key);
        } catch {
          // Without the lookup we still show the generic failure below.
        }
      }

      setOverlay((o) => ({ ...o, visible: false }));
      setSubmitFailure(
        existing
          ? { kind: 'duplicate', message: error.message || 'Ya existe un movimiento para ese reparto y fecha.', movementId: existing.id }
          : { kind: 'failed', ...getSubmitFailureCopy({ message: error.message, status }, sendableSerials.length) },
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isLoad = type === 'LOAD';
  const hasSerials = serials.length > 0;
  const sendableCount = sendableSerials.length;

  function openScanner() {
    refreshInvalidSerials(); // lista fresca antes de escanear la tanda
    setShowScanner(true);
  }

  const header = (
    <ScreenHeader
      title="Dispensers"
      onBack={() => router.back()}
      right={<Pill label="Hoy" icon="list-outline" onPress={() => router.push('/dispenser-movements')} />}
    />
  );

  const Header = (
    <View style={styles.form}>
      <MovementDataBlock
        type={type}
        onTypeChange={setType}
        routeCode={routeCode}
        onRouteCodeChange={setRouteCode}
        dateLabel={toShortDisplayDate(movementDate)}
        dateFixed={dateTouched}
        onDatePress={() => setShowDatePicker(true)}
        technician={technician}
        onTechnicianPress={() => setShowTechnicianSheet(true)}
      />

      <View style={styles.serialsHeader}>
        <Text style={styles.sectionTitle} accessibilityRole="header">Dispensers</Text>
        <View style={[styles.countPill, sendableCount > 0 && styles.countPillOn]}>
          <Text style={[styles.countPillText, sendableCount > 0 && styles.countPillTextOn]}>
            {sendableCount}
          </Text>
        </View>
        <View style={styles.flex} />
        {hasSerials && (
          <Pill label="Vaciar" icon="trash-outline" tone="destructive" onPress={clearSerials} />
        )}
        <Pill label="A mano" icon="add" onPress={() => setShowManualSheet(true)} />
      </View>

      {(invalidCount > 0 || (isLoad && odooUnavailableCount > 0) || baggedCount > 0) && (
        <View style={styles.warnChips}>
          {baggedCount > 0 && (
            <View style={[styles.chip, styles.chipBagged]}>
              <Ionicons name="bag-check-outline" size={14} color={C.blueText} />
              <Text style={[styles.chipText, { color: C.blueText }]}>
                {baggedCount} embolsado{baggedCount !== 1 ? 's' : ''} · sin reparación
              </Text>
            </View>
          )}
          {invalidCount > 0 && isLoad && (
            <View style={[styles.chip, styles.chipError]}>
              <Ionicons name="close-circle-outline" size={14} color={C.redText} />
              <Text style={[styles.chipText, { color: C.redText }]}>
                {invalidCount} no normalizado{invalidCount !== 1 ? 's' : ''} · no se envía{invalidCount !== 1 ? 'n' : ''}
              </Text>
            </View>
          )}
          {invalidCount > 0 && !isLoad && (
            <View style={[styles.chip, styles.chipWarning]}>
              <Ionicons name="git-branch-outline" size={14} color={C.orangeText} />
              <Text style={[styles.chipText, { color: C.orangeText }]}>
                {invalidCount} no normalizado{invalidCount !== 1 ? 's' : ''} · van a Odoo
              </Text>
            </View>
          )}
          {isLoad && odooUnavailableCount > 0 && (
            <View style={[styles.chip, styles.chipWarning]}>
              <Ionicons name="alert-circle-outline" size={14} color={C.orangeText} />
              <Text style={[styles.chipText, { color: C.orangeText }]}>
                {odooUnavailableCount} no disponible{odooUnavailableCount !== 1 ? 's' : ''} en Odoo
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  if (catalogLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        {header}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.navy} />
          <Text style={styles.loadingText}>Cargando catálogos de Aguas...</Text>
        </View>
      </View>
    );
  }

  if (catalogError) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        {header}
        <View style={styles.centered}>
          <EmptyState icon="cloud-offline-outline" title="No se pudieron cargar los catálogos" hint={catalogError} />
          <View style={styles.retryWrap}>
            <SecondaryButton title="Reintentar" icon="refresh" onPress={loadCatalogs} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {header}

      <FlatList
        style={styles.flatList}
        data={serials}
        keyExtractor={(item) => item.code}
        ListHeaderComponent={Header}
        renderItem={({ item }) => (
          <SerialRow
            code={item.code}
            status={getSerialRowStatus({
              type,
              valid: item.valid,
              odoo: odooValidation.get(item.code),
            })}
            onRemove={() => removeSerial(item.code)}
            bagged={
              isLoad
                ? undefined
                : { value: item.bagged, onToggle: () => handleToggleBagged(item.code) }
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="barcode-outline"
            title="Todavía no cargaste dispensers"
            hint="Escaneá con la cámara o ingresá el serial a mano"
            style={styles.empty}
          />
        }
        contentContainerStyle={[styles.list, { paddingBottom: BOTTOM_BAR_SPACE + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />
        }
      />

      {/* One main action: scan while the list is empty, send once there are dispensers */}
      <BottomBar>
        {hasSerials ? (
          <>
            <CircleButton
              icon="barcode-outline"
              size="large"
              onPress={openScanner}
              accessibilityLabel="Escanear dispensers"
            />
            <View style={styles.flex}>
              <PrimaryButton
                title={
                  sendableCount > 0
                    ? `Enviar ${sendableCount} dispenser${sendableCount !== 1 ? 's' : ''}`
                    : 'Enviar'
                }
                icon="cloud-upload-outline"
                onPress={handleSubmit}
                loading={submitting}
                disabled={!canSubmit}
              />
            </View>
          </>
        ) : (
          <View style={styles.flex}>
            <PrimaryButton title="Escanear dispensers" icon="barcode-outline" onPress={openScanner} />
          </View>
        )}
      </BottomBar>

      <DatePickerModal
        visible={showDatePicker}
        value={movementDate}
        onChange={(date) => {
          setMovementDate(date);
          setDateTouched(true);
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
      />

      <TextEntrySheet
        visible={showManualSheet}
        onClose={() => {
          setShowManualSheet(false);
          setManualSerial('');
        }}
        title="Ingresar serial a mano"
        label="Serial del dispenser"
        placeholder="Escribí el serial"
        fieldIcon="create-outline"
        value={manualSerial}
        onChangeText={setManualSerial}
        // Stays open after adding so several serials can be typed in a row.
        onSubmit={handleAddManual}
        submitLabel="Agregar"
        submitIcon="add"
        canSubmit={manualSerial.trim().length > 0}
        inputProps={{ autoCapitalize: 'characters', autoCorrect: false }}
      />

      <TextEntrySheet
        visible={showTechnicianSheet}
        onClose={() => setShowTechnicianSheet(false)}
        title="Técnico"
        label="Nombre del técnico"
        placeholder="Nombre del técnico"
        fieldIcon="person-outline"
        value={technician}
        onChangeText={setTechnician}
        onSubmit={() => setShowTechnicianSheet(false)}
        submitLabel="Listo"
        submitIcon="checkmark"
        inputProps={{ autoCapitalize: 'characters' }}
      />

      <BarcodeScannerModal
        visible={showScanner}
        existingSerials={serialCodes}
        invalidSerials={invalidSerials}
        invalidFeedbackLabel={isLoad ? 'No normalizado · no se envía: ' : 'No normalizado → Odoo: '}
        onAdd={addScanned}
        onClose={() => setShowScanner(false)}
      />

      <MovementRegisteredScreen
        movement={registered}
        followingUp={registered !== null && followingId === registered.id}
        onNew={() => setRegistered(null)}
        onSeeMovements={() => {
          setRegistered(null);
          router.push('/dispenser-movements');
        }}
      />

      <BottomSheet
        visible={submitFailure !== null}
        onDismiss={() => setSubmitFailure(null)}
        tone={submitFailure?.kind === 'duplicate' ? 'error' : 'warning'}
        icon={submitFailure?.kind === 'duplicate' ? 'close' : 'cloud-offline-outline'}
        title={submitFailure?.kind === 'duplicate' ? 'No se pudo registrar' : submitFailure?.title}
        message={submitFailure?.message}
        actions={
          submitFailure?.kind === 'duplicate' ? (
            <>
              <PrimaryButton
                title="Ver ese movimiento"
                icon="arrow-forward"
                iconPosition="end"
                onPress={() => {
                  const id = submitFailure.movementId;
                  setSubmitFailure(null);
                  router.push(`/dispenser-movement-detail?id=${id}`);
                }}
              />
              <SecondaryButton title="Entendido" onPress={() => setSubmitFailure(null)} />
            </>
          ) : (
            <>
              <PrimaryButton title="Reintentar" icon="refresh" onPress={handleSubmit} loading={submitting} />
              <SecondaryButton title="Cerrar" onPress={() => setSubmitFailure(null)} />
            </>
          )
        }
      />

      <StatusOverlay
        visible={overlay.visible}
        status={overlay.status}
        title={overlay.title}
        message={overlay.message}
        onDismiss={() => setOverlay((o) => ({ ...o, visible: false }))}
      />
    </View>
  );
}

// Primary button (60) + vertical padding of the bottom bar, so the last row isn't hidden.
const BOTTOM_BAR_SPACE = H.primaryButton + S.md * 2 + S.lg;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  flex: { flex: 1 },
  flatList: { flex: 1 },
  list: { paddingHorizontal: S.gutter, gap: S.sm },
  centered: { flex: 1, justifyContent: 'center', padding: S.gutter, gap: S.lg },
  loadingText: { ...T.body, color: C.ink2, textAlign: 'center' },
  retryWrap: { alignSelf: 'center' },

  form: { gap: S.md, marginBottom: S.xs },

  serialsHeader: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.sm },
  sectionTitle: { ...T.section, color: C.navy },
  countPill: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: S.sm,
    borderRadius: 12,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillOn: { backgroundColor: C.navy },
  countPillText: { ...T.secondary, fontFamily: T.button.fontFamily, color: C.navy, fontVariant: ['tabular-nums'] },
  countPillTextOn: { color: C.white },

  warnChips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs + 2,
    minHeight: 32,
    paddingHorizontal: S.md,
    borderRadius: R.full,
  },
  chipBagged: { backgroundColor: C.blueLight },
  chipError: { backgroundColor: C.redSoft },
  chipWarning: { backgroundColor: C.orangeSoft },
  chipText: { ...T.secondary, fontFamily: T.label.fontFamily, flexShrink: 1 },

  empty: { marginTop: S.xs, minHeight: 260 },
});

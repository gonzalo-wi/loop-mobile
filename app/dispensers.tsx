import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { HeroHeader } from '@/components/HeroHeader';
import { StatusOverlay, type OverlayStatus } from '@/components/ui';
import { DatePickerModal } from '@/features/stock-controls/components/DatePickerModal';
import { BarcodeScannerModal } from '@/features/dispensers/components/BarcodeScannerModal';
import {
  getAguasLocations,
  getAguasStates,
  createDispenserMovement,
} from '@/features/dispensers/services/dispenserApi';
import {
  getUnregisteredSerials,
  normalizeSerial,
} from '@/features/dispensers/services/dispenserValidationApi';
import {
  getOdooAvailableEquipment,
  validateOdooEquipment,
} from '@/features/dispensers/services/odooApi';
import { pollOdooStatus } from '@/features/dispensers/hooks/useOdooPolling';
import {
  expectsOdooDispatch,
  getExclusionNotice,
  shouldSendSerial,
} from '@/features/dispensers/lib/movementOutcome';
import type {
  AguasCatalog,
  AguasCatalogItem,
  DispenserMovementType,
  OdooEquipment,
  OdooValidationResult,
} from '@/features/dispensers/types';
import { C, R, S, F, W, Shdw } from '@/lib/theme';

// Tiempo de éxito visible antes de resolver el estado de Odoo y resetear el form.
const SUCCESS_OVERLAY_MS = 1600;
// Ventana de polling de Odoo tras crear el movimiento (ver useOdooPolling).
const ODOO_RESULT_OVERLAY_MS = 2200;
// Debounce para no spammear la validación Odoo mientras se escanea en tanda.
const ODOO_VALIDATE_DEBOUNCE_MS = 900;

type SerialSource = 'scan' | 'manual';
/**
 * `valid: false` = no registrado (no normalizado) según jMobile.
 * LOAD: se muestra en rojo y NO se envía. UNLOAD: se envía igual y el backend lo deriva a la
 * ubicación de no normalizados en Odoo (ver `shouldSendSerial`).
 */
type SerialEntry = { code: string; source: SerialSource; valid: boolean };

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toDisplayDate(date: Date): string {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${days[date.getDay()]} ${d}/${m}/${date.getFullYear()}`;
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

  // Seriales no normalizados del día según jMobile (ver `shouldSendSerial` para qué se envía).
  const [invalidSerials, setInvalidSerials] = useState<Set<string>>(new Set());

  // Panel "Equipos disponibles en Odoo" — solo informativo, solo para LOAD.
  const [odooEquipment, setOdooEquipment] = useState<OdooEquipment[]>([]);
  const [odooEquipmentLoading, setOdooEquipmentLoading] = useState(false);
  const [odooEquipmentError, setOdooEquipmentError] = useState<string | null>(null);
  // Distingue la primera consulta (panel vacío, tapa todo con el loading) de
  // una re-consulta posterior —foco o pull-to-refresh— donde preferimos
  // mantener a la vista el último resultado y marcar "Actualizando" en vez
  // de taparlo, para que no parpadee la info que el operario ya vio.
  const [odooEquipmentLoaded, setOdooEquipmentLoaded] = useState(false);

  // Pull-to-refresh del panel Odoo + seriales inválidos de Aguas.
  const [refreshing, setRefreshing] = useState(false);

  // Validación Odoo de series agregadas (independiente de la de Aguas).
  const [odooValidation, setOdooValidation] = useState<Map<string, OdooValidationResult>>(
    new Map(),
  );
  const odooValidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [submitting, setSubmitting] = useState(false);
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
   * Equipos disponibles en Odoo para cargar (solo LOAD). Es un panel
   * informativo: si falla, no bloqueamos el trabajo del operario.
   */
  const loadOdooEquipment = useCallback(async () => {
    setOdooEquipmentLoading(true);
    // El error/dataset previo se mantiene a la vista mientras se re-consulta
    // (foco o pull-to-refresh) y solo se reemplaza al tener la respuesta
    // nueva, para que el panel no "parpadee" a un estado vacío intermedio.
    try {
      const equipos = await getOdooAvailableEquipment();
      setOdooEquipment(equipos);
      setOdooEquipmentError(null);
    } catch (e) {
      setOdooEquipmentError(e instanceof Error ? e.message : 'No se pudo consultar Odoo');
    } finally {
      setOdooEquipmentLoading(false);
      setOdooEquipmentLoaded(true);
    }
  }, []);

  /**
   * Al enfocar la pantalla (montaje inicial o volver a ella), traemos datos
   * frescos: equipos de Odoo (solo LOAD) y seriales no normalizados en jMobile.
   * Así evitamos depender del re-montaje (cerrar sesión) para ver altas
   * hechas en Odoo mientras el operario ya estaba en esta pantalla.
   *
   * `type` está en las deps del callback memoizado: como `useFocusEffect`
   * re-ejecuta el efecto cuando cambia la identidad del callback (además de
   * en cada foco), cambiar de UNLOAD→LOAD estando ya parado en la pantalla
   * también dispara esta carga — sin necesidad de un `useEffect` aparte que
   * duplicaría el pedido.
   */
  useFocusEffect(
    useCallback(() => {
      if (type === 'LOAD') loadOdooEquipment();
      refreshInvalidSerials();
    }, [type, loadOdooEquipment, refreshInvalidSerials]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const tasks: Promise<void>[] = [refreshInvalidSerials()];
      if (type === 'LOAD') tasks.push(loadOdooEquipment());
      await Promise.all(tasks);
    } finally {
      setRefreshing(false);
    }
  }, [type, loadOdooEquipment, refreshInvalidSerials]);

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
  // Series marcadas por Odoo como no disponibles (aviso independiente del de Aguas).
  const odooUnavailableCount = serials.filter((s) => {
    const result = odooValidation.get(s.code);
    return result ? !result.disponible : false;
  }).length;

  const addSerial = useCallback((code: string, source: SerialSource) => {
    const clean = code.replace(/\s+/g, ''); // saca todos los espacios (puntas e internos)
    if (!clean) return;
    // Los no normalizados (jMobile) se agregan igual, marcados; si se envían depende del tipo.
    const valid = !invalidSerials.has(normalizeSerial(clean));
    setSerials((prev) =>
      prev.some((s) => s.code === clean) ? prev : [...prev, { code: clean, source, valid }],
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
    setSubmitting(true);
    setOverlay({ visible: true, status: 'loading', title: 'Registrando movimiento...' });
    try {
      const created = await createDispenserMovement({
        type,
        routeCode: routeCode.trim(),
        technician: technician.trim(),
        locationId: location?.id,
        stateId: movState?.id,
        movementDate: toDateString(movementDate),
        serials: sendableSerials.map((s) => s.code),
      });

      const count = sendableSerials.length;
      const isLoadMovement = type === 'LOAD';
      const notice = getExclusionNotice(created);
      const nothingSentToAguas = created.status === 'SKIPPED_UNREGISTERED';

      setOverlay({
        visible: true,
        status: 'success',
        title: '¡Movimiento registrado!',
        message: nothingSentToAguas
          ? `${count} dispenser${count !== 1 ? 's' : ''} · Reparto ${routeCode.trim()}. No se envió a Aguas.`
          : isLoadMovement
            ? `${count} dispenser${count !== 1 ? 's' : ''} · Reparto ${routeCode.trim()}. Enviando a Aguas y Odoo...`
            : `${count} dispenser${count !== 1 ? 's' : ''} · Reparto ${routeCode.trim()}. Se está enviando a Aguas.`,
      });

      // El reset del form es rápido para no trabar al operario; el resultado
      // de Odoo (asíncrono) se resuelve aparte y solo actualiza el overlay
      // mientras siga visible.
      setTimeout(() => {
        setOverlay((o) => ({ ...o, visible: false }));
        setRouteCode('');
        setSerials([]);
        // Los excluidos se avisan con un diálogo (no un toast) para que no pasen desapercibidos:
        // es el caso en que el operario cree que cargó algo que no fue a Aguas.
        if (notice) {
          Alert.alert(notice.title, notice.message, [{ text: 'Entendido' }], {
            cancelable: !notice.requiresConfirmation,
          });
        }
      }, SUCCESS_OVERLAY_MS);

      // Sin nada enviado a Aguas no hay salida a Odoo: el polling esperaría en vano.
      if (expectsOdooDispatch(created)) {
        pollOdooStatus(created.id)
          .then((resolved) => {
            const odooMessage =
              resolved.odooStatus === 'SENT'
                ? `Registrado en Odoo · ${resolved.odooPickingName ?? 'comprobante generado'}.`
                : resolved.odooStatus === 'ERROR'
                  ? 'Odoo rechazó la carga. Revisalo en Movimientos.'
                  : 'Odoo sigue procesando, revisalo en Movimientos.';
            const odooStatusForOverlay: OverlayStatus =
              resolved.odooStatus === 'ERROR' ? 'error' : 'success';

            setOverlay({
              visible: true,
              status: odooStatusForOverlay,
              title: resolved.odooStatus === 'ERROR' ? 'Aviso de Odoo' : '¡Movimiento registrado!',
              message: odooMessage,
            });
            setTimeout(() => {
              setOverlay((o) => ({ ...o, visible: false }));
            }, ODOO_RESULT_OVERLAY_MS);
          })
          .catch(() => {
            // Si falla la reconsulta, no molestamos: el estado se puede ver en Movimientos.
          });
      }
    } catch (e) {
      setOverlay({
        visible: true,
        status: 'error',
        title: 'No se pudo registrar',
        message: e instanceof Error ? e.message : 'Intentá de nuevo',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const isLoad = type === 'LOAD';

  const Header = (
    <View style={styles.form}>
      {/* Tipo de movimiento — dos tarjetas seleccionables */}
      <Text style={styles.sectionLabel}>Tipo de movimiento</Text>
      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[styles.typeCard, isLoad && styles.typeCardLoad]}
          onPress={() => setType('LOAD')}
          activeOpacity={0.85}
        >
          <View style={[styles.typeIcon, isLoad ? styles.typeIconLoad : styles.typeIconOff]}>
            <Ionicons name="arrow-up" size={20} color={isLoad ? '#fff' : C.textMuted} />
          </View>
          <Text style={[styles.typeTitle, isLoad && { color: C.exit }]}>Carga</Text>
          <Text style={styles.typeSub}>Sube al camión</Text>
          {isLoad && <View style={[styles.typeCheck, { backgroundColor: C.exit }]}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typeCard, !isLoad && styles.typeCardUnload]}
          onPress={() => setType('UNLOAD')}
          activeOpacity={0.85}
        >
          <View style={[styles.typeIcon, !isLoad ? styles.typeIconUnload : styles.typeIconOff]}>
            <Ionicons name="arrow-down" size={20} color={!isLoad ? '#fff' : C.textMuted} />
          </View>
          <Text style={[styles.typeTitle, !isLoad && { color: C.entry }]}>Descarga</Text>
          <Text style={styles.typeSub}>Baja del camión</Text>
          {!isLoad && <View style={[styles.typeCheck, { backgroundColor: C.entry }]}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>}
        </TouchableOpacity>
      </View>

      {/* Datos del movimiento */}
      <Text style={styles.sectionLabel}>Datos del movimiento</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={18} color={C.textMuted} />
          <View style={styles.fieldBody}>
            <View style={styles.dateLabelRow}>
              <Text style={styles.fieldLabel}>{isLoad ? 'Fecha de carga' : 'Fecha de descarga'}</Text>
              {dateTouched ? (
                <View style={styles.dateFixedChip}>
                  <Ionicons name="pin" size={9} color={C.primary} />
                  <Text style={styles.dateFixedText}>Fija</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.fieldValue}>{toDisplayDate(movementDate)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.borderStrong} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.inputRow}>
          <View style={styles.inputCol}>
            <Text style={styles.fieldLabel}>Reparto</Text>
            <TextInput
              style={styles.input}
              value={routeCode}
              onChangeText={setRouteCode}
              placeholder="Ej: 179"
              placeholderTextColor={C.textFaint}
              keyboardType="number-pad"
              returnKeyType="done"
            />
          </View>
        </View>

        <View style={styles.inputRow}>
          <View style={styles.inputCol}>
            <Text style={styles.fieldLabel}>Técnico</Text>
            <TextInput
              style={styles.input}
              value={technician}
              onChangeText={setTechnician}
              placeholder="Nombre del técnico"
              placeholderTextColor={C.textFaint}
              autoCapitalize="characters"
            />
          </View>
        </View>
      </View>

      {/* Equipos disponibles en Odoo — solo informativo, solo LOAD */}
      {isLoad && (
        <View style={styles.odooPanel}>
          <View style={styles.odooPanelHeader}>
            <View style={styles.odooBadge}>
              <Ionicons name="cube-outline" size={12} color="#fff" />
              <Text style={styles.odooBadgeText}>ODOO</Text>
            </View>
            <Text style={styles.odooPanelTitle}>Equipos disponibles para cargar</Text>
            {odooEquipmentLoading && odooEquipmentLoaded && (
              <View style={styles.odooRefreshingTag}>
                <ActivityIndicator size="small" color={C.odoo} />
                <Text style={styles.odooRefreshingText}>Actualizando</Text>
              </View>
            )}
          </View>
          {odooEquipmentLoading && !odooEquipmentLoaded ? (
            <View style={styles.odooPanelRow}>
              <ActivityIndicator size="small" color={C.odoo} />
              <Text style={styles.odooPanelText}>Consultando Odoo...</Text>
            </View>
          ) : odooEquipmentError ? (
            <View style={styles.odooPanelRow}>
              <Ionicons name="cloud-offline-outline" size={15} color={C.textMuted} />
              <Text style={styles.odooPanelText} numberOfLines={1}>
                No se pudo consultar Odoo (no bloquea la carga)
              </Text>
              <TouchableOpacity onPress={loadOdooEquipment} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.odooRetryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : odooEquipment.length === 0 ? (
            <View style={styles.odooPanelRow}>
              <Ionicons name="file-tray-outline" size={15} color={C.textMuted} />
              <Text style={styles.odooPanelText}>Sin equipos disponibles por ahora</Text>
            </View>
          ) : (
            <>
              <Text style={styles.odooPanelText}>
                {odooEquipment.length} equipo{odooEquipment.length !== 1 ? 's' : ''} listo
                {odooEquipment.length !== 1 ? 's' : ''} para cargar
              </Text>
              <Text style={styles.odooPanelSample} numberOfLines={2}>
                {odooEquipment.slice(0, 6).map((e) => e.serie).join(' · ')}
                {odooEquipment.length > 6 ? '…' : ''}
              </Text>
            </>
          )}
        </View>
      )}

      {/* Dispensers */}
      <View style={styles.serialsHeader}>
        <Text style={styles.sectionLabel}>Dispensers</Text>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{sendableSerials.length}</Text>
        </View>
        {serials.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearSerials} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={14} color={C.danger} />
            <Text style={styles.clearBtnText}>Vaciar</Text>
          </TouchableOpacity>
        )}
      </View>

      {(invalidCount > 0 || (isLoad && odooUnavailableCount > 0)) && (
        <View style={styles.warnPillsRow}>
          {invalidCount > 0 && isLoad && (
            <View style={styles.invalidPill}>
              <Ionicons name="close-circle" size={11} color={C.danger} />
              <Text style={styles.invalidPillText}>
                {invalidCount} no normalizado{invalidCount !== 1 ? 's' : ''} · no se envía{invalidCount !== 1 ? 'n' : ''}
              </Text>
            </View>
          )}
          {invalidCount > 0 && !isLoad && (
            <View style={styles.noNormalizadoPill}>
              <Ionicons name="git-branch-outline" size={11} color={C.warning} />
              <Text style={styles.noNormalizadoPillText}>
                {invalidCount} no normalizado{invalidCount !== 1 ? 's' : ''} · van a Odoo
              </Text>
            </View>
          )}
          {isLoad && odooUnavailableCount > 0 && (
            <View style={styles.odooWarnPill}>
              <Ionicons name="alert-circle" size={11} color={C.odoo} />
              <Text style={styles.odooWarnPillText}>
                {odooUnavailableCount} no disponible{odooUnavailableCount !== 1 ? 's' : ''} en Odoo
              </Text>
            </View>
          )}
        </View>
      )}

      {/* CTA escanear */}
      <TouchableOpacity
        style={styles.scanBtn}
        onPress={() => {
          refreshInvalidSerials(); // lista fresca antes de escanear la tanda
          setShowScanner(true);
        }}
        activeOpacity={0.9}
      >
        <View style={styles.scanIcon}>
          <Ionicons name="barcode-outline" size={24} color="#fff" />
        </View>
        <View style={styles.scanTextWrap}>
          <Text style={styles.scanBtnText}>Escanear dispensers</Text>
          <Text style={styles.scanBtnSub}>Con la cámara, uno tras otro</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      {/* Carga manual */}
      <View style={styles.manualRow}>
        <View style={styles.manualInputWrap}>
          <Ionicons name="create-outline" size={18} color={C.textMuted} />
          <TextInput
            style={styles.manualInput}
            value={manualSerial}
            onChangeText={setManualSerial}
            placeholder="Ingresar serial a mano"
            placeholderTextColor={C.textFaint}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleAddManual}
          />
        </View>
        <TouchableOpacity
          style={[styles.manualAdd, !manualSerial.trim() && styles.manualAddDisabled]}
          onPress={handleAddManual}
          disabled={!manualSerial.trim()}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (catalogLoading) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <HeroHeader title="Dispensers" subtitle="Carga y descarga" onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Cargando catálogos de Aguas...</Text>
        </View>
      </View>
    );
  }

  if (catalogError) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <HeroHeader title="Dispensers" subtitle="Carga y descarga" onBack={() => router.back()} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{catalogError}</Text>
          <TouchableOpacity onPress={loadCatalogs} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <HeroHeader
        title="Dispensers"
        subtitle={isLoad ? 'Carga al camión' : 'Descarga del camión'}
        onBack={() => router.back()}
        rightAction={{ label: 'Hoy', icon: 'list-outline', onPress: () => router.push('/dispenser-movements') }}
      />

      <FlatList
        style={styles.flatList}
        data={serials}
        keyExtractor={(item) => item.code}
        ListHeaderComponent={Header}
        renderItem={({ item, index }) => {
          const odooResult = isLoad ? odooValidation.get(item.code) : undefined;
          const odooUnavailable = odooResult ? !odooResult.disponible : false;
          // LOAD: no registrado = rechazado (rojo, no se envía).
          // UNLOAD: no registrado = no normalizado (ámbar, se envía y el backend lo deriva a Odoo).
          const rejected = !item.valid && isLoad;
          const noNormalizado = !item.valid && !isLoad;
          return (
            <View
              style={[
                styles.serialRow,
                rejected && styles.serialRowInvalid,
                noNormalizado && styles.serialRowNoNormalizado,
              ]}
            >
              <View
                style={[
                  styles.serialIndex,
                  rejected && styles.serialIndexInvalid,
                  noNormalizado && styles.serialIndexNoNormalizado,
                ]}
              >
                {rejected ? (
                  <Ionicons name="close" size={15} color={C.danger} />
                ) : noNormalizado ? (
                  <Ionicons name="git-branch-outline" size={14} color={C.warning} />
                ) : (
                  <Text style={styles.serialIndexText}>{index + 1}</Text>
                )}
              </View>
              <Ionicons
                name={item.source === 'scan' ? 'barcode-outline' : 'create-outline'}
                size={16}
                color={rejected ? C.danger : noNormalizado ? C.warning : C.textMuted}
              />
              <View style={styles.serialBody}>
                <Text
                  style={[styles.serialText, rejected && styles.serialTextInvalid]}
                  numberOfLines={1}
                >
                  {item.code}
                </Text>
                {rejected && (
                  <Text style={styles.serialInvalidTag}>No normalizado (jMobile) · no se envía</Text>
                )}
                {noNormalizado && (
                  <Text style={styles.serialNoNormalizadoTag} numberOfLines={1}>
                    No normalizado · va a Odoo (no normalizados)
                  </Text>
                )}
                {item.valid && odooUnavailable && (
                  <View style={styles.serialOdooTagRow}>
                    <Ionicons name="alert-circle" size={11} color={C.odoo} />
                    <Text style={styles.serialOdooTag} numberOfLines={1}>
                      Odoo: no disponible{odooResult?.motivo ? ` · ${odooResult.motivo}` : ''}
                    </Text>
                  </View>
                )}
              </View>
              {item.valid && <Ionicons name="checkmark-circle" size={19} color={C.success} />}
              <TouchableOpacity
                onPress={() => removeSerial(item.code)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptySerials}>
            <View style={styles.emptyIcon}>
              <Ionicons name="scan-outline" size={34} color={C.textMuted} />
            </View>
            <Text style={styles.emptySerialsTitle}>Todavía no cargaste dispensers</Text>
            <Text style={styles.emptySerialsText}>
              Escaneá con la cámara o ingresá el serial a mano
            </Text>
          </View>
        }
        contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      />

      {/* Botón flotante de envío */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 16 }, !canSubmit && styles.fabDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            <Text style={styles.submitText}>
              Enviar{sendableSerials.length > 0 ? ` · ${sendableSerials.length}` : ''}
            </Text>
          </>
        )}
      </TouchableOpacity>

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

      <BarcodeScannerModal
        visible={showScanner}
        existingSerials={serialCodes}
        invalidSerials={invalidSerials}
        invalidFeedbackLabel={isLoad ? 'No normalizado · no se envía: ' : 'No normalizado → Odoo: '}
        onAdd={addScanned}
        onClose={() => setShowScanner(false)}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  flatList: { flex: 1 },
  list: { padding: 16, gap: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: C.textMuted, fontSize: F.base },
  errorText: { color: C.danger, fontSize: F.base, textAlign: 'center', marginBottom: 14 },
  retryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: C.primary,
    borderRadius: R.md,
  },
  retryText: { color: '#fff', fontSize: F.base, fontWeight: W.bold },

  form: { gap: 8 },

  sectionLabel: {
    fontSize: F.xs + 1,
    fontWeight: W.extra,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 2,
  },

  // Tipo
  typeRow: { flexDirection: 'row', gap: 10 },
  typeCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 14,
    borderWidth: 2,
    borderColor: C.border,
    ...Shdw.xs,
  },
  typeCardLoad: { borderColor: C.exit, backgroundColor: C.exitLight },
  typeCardUnload: { borderColor: C.entry, backgroundColor: C.entryLight },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  typeIconOff: { backgroundColor: C.inputBg },
  typeIconLoad: { backgroundColor: C.exit },
  typeIconUnload: { backgroundColor: C.entry },
  typeTitle: { fontSize: F.md, fontWeight: W.extra, color: C.text },
  typeSub: { fontSize: F.xs + 1, color: C.textMuted, fontWeight: W.medium, marginTop: 2 },
  typeCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: R.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Datos card
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
    ...Shdw.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  fieldBody: { flex: 1 },
  fieldLabel: {
    fontSize: F.xs,
    color: C.textMuted,
    fontWeight: W.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dateLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  dateFixedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: C.primaryLight,
    borderRadius: R.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginBottom: 4,
  },
  dateFixedText: { fontSize: 9, fontWeight: W.extra, color: C.primary, textTransform: 'uppercase' },
  fieldValue: { fontSize: F.base, fontWeight: W.bold, color: C.text, marginBottom: 0 },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: -14 },
  inputRow: { paddingVertical: 10 },
  inputCol: { flex: 1 },
  input: {
    backgroundColor: C.inputBg,
    borderRadius: R.md,
    paddingHorizontal: 14,
    height: 50,
    fontSize: F.md,
    fontWeight: W.semibold,
    color: C.text,
  },

  // Panel "Equipos disponibles en Odoo"
  odooPanel: {
    backgroundColor: C.odooLight,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.odooBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
    gap: 6,
  },
  odooPanelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', rowGap: 4 },
  odooBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.odoo,
    borderRadius: R.xs,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  odooBadgeText: { fontSize: 9, fontWeight: W.extra, color: '#fff', letterSpacing: 0.4 },
  odooPanelTitle: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 120,
    fontSize: F.sm + 1,
    fontWeight: W.extra,
    color: C.textStrong,
  },
  odooRefreshingTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  odooRefreshingText: { fontSize: F.xs, fontWeight: W.bold, color: C.odoo },
  odooPanelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  odooPanelText: { flex: 1, fontSize: F.sm, fontWeight: W.medium, color: C.textSub },
  odooPanelSample: { fontSize: F.xs, color: C.textMuted, fontWeight: W.medium },
  odooRetryText: { fontSize: F.xs + 1, fontWeight: W.bold, color: C.odoo },

  // Serials header
  serialsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  countPill: {
    backgroundColor: C.primaryLight,
    borderRadius: R.full,
    paddingHorizontal: 9,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countPillText: { fontSize: F.sm, fontWeight: W.extra, color: C.primary },
  warnPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.xs + 2, marginTop: -2 },
  invalidPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.dangerLight,
    borderRadius: R.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  invalidPillText: { fontSize: F.xs, fontWeight: W.extra, color: C.danger },
  noNormalizadoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.warningLight,
    borderRadius: R.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  noNormalizadoPillText: { fontSize: F.xs, fontWeight: W.extra, color: C.warning },
  odooWarnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.odooLight,
    borderRadius: R.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  odooWarnPillText: { fontSize: F.xs, fontWeight: W.extra, color: C.odoo },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: R.full,
    backgroundColor: C.dangerLight,
  },
  clearBtnText: { fontSize: F.xs + 1, fontWeight: W.bold, color: C.danger },

  // Scan CTA
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.primary,
    borderRadius: R.lg,
    padding: 14,
    marginTop: 4,
    ...Shdw.card,
  },
  scanIcon: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTextWrap: { flex: 1 },
  scanBtnText: { color: '#fff', fontSize: F.md, fontWeight: W.extra },
  scanBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: F.xs + 1, fontWeight: W.medium, marginTop: 1 },

  // Manual
  manualRow: { flexDirection: 'row', gap: 8 },
  manualInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 48,
  },
  manualInput: { flex: 1, fontSize: F.base, color: C.text, fontWeight: W.medium, paddingVertical: 0 },
  manualAdd: {
    width: 48,
    height: 48,
    borderRadius: R.md,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualAddDisabled: { backgroundColor: C.borderStrong },

  // Serial rows
  serialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: R.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    ...Shdw.xs,
  },
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
  // No normalizado en una carga: fila en rojo, no se envía.
  serialRowInvalid: {
    backgroundColor: C.dangerLight,
    borderWidth: 1,
    borderColor: '#F7C7C8',
  },
  serialIndexInvalid: { backgroundColor: '#FBDADB' },
  serialTextInvalid: { color: C.danger, textDecorationLine: 'line-through' },
  serialInvalidTag: { fontSize: F.xs, fontWeight: W.bold, color: C.danger, marginTop: 1 },
  serialOdooTagRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  serialOdooTag: { fontSize: F.xs, fontWeight: W.bold, color: C.odoo },
  // No normalizado en una descarga: fila ámbar, se envía y el backend la deriva a Odoo.
  serialRowNoNormalizado: {
    backgroundColor: C.warningLight,
    borderWidth: 1,
    borderColor: C.warningBorder,
  },
  serialIndexNoNormalizado: { backgroundColor: C.surface },
  serialNoNormalizadoTag: { fontSize: F.xs, fontWeight: W.bold, color: C.warning, marginTop: 1 },

  emptySerials: { alignItems: 'center', paddingVertical: 30, gap: 6 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: R.full,
    backgroundColor: C.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptySerialsTitle: { fontSize: F.base, fontWeight: W.bold, color: C.textSub },
  emptySerialsText: {
    fontSize: F.sm + 1,
    color: C.textMuted,
    textAlign: 'center',
    paddingHorizontal: 30,
  },

  // FAB
  fab: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: R.lg,
    height: 56,
    ...Shdw.float,
  },
  fabDisabled: { backgroundColor: C.borderStrong, opacity: 0.9 },
  submitText: { color: '#fff', fontSize: F.md, fontWeight: W.extra },
});

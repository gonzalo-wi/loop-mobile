import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getStockControl,
  updateStockControl,
  correctStockControl,
} from '@/features/stock-controls/services/stockControlApi';
import { getProducts } from '@/features/stock-controls/services/productsApi';
import { ProductControlCard } from '@/features/stock-controls/components/ProductControlCard';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import { useAuthStore } from '@/store/authStore';
import { C, R, Shdw } from '@/lib/theme';
import type {
  StockControl,
  StockControlItem,
  Product,
  ProductControlValues,
} from '@/features/stock-controls/types';
import {
  REASON_MAX_LENGTH,
  EMPTY_PRODUCT_VALUES,
  isControlCorrectable,
  validateCorrectionReason,
  buildInitialFormValues,
  buildItems,
} from '@/features/stock-controls/lib/editControlLogic';

const AGUAS_REFRESH_DELAY_MS = 2500;

function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  CONTROLLED: { label: 'Controlado', color: C.primary },
  PENDING_DRIVER_APPROVAL: { label: 'Pendiente aprobación', color: C.warning },
  ACCEPTED_BY_DRIVER: { label: 'Aprobado', color: C.success },
  REJECTED_BY_DRIVER: { label: 'Rechazado', color: C.danger },
  WITH_DIFFERENCES: { label: 'Con diferencias', color: '#D97706' },
  SENT_TO_AGUAS: { label: 'Enviado a Aguas', color: '#6D28D9' },
  AGUAS_ERROR: { label: 'Error Aguas', color: '#B91C1C' },
  CANCELLED: { label: 'Cancelado', color: '#6B7280' },
};

// ─── Read-only item list for non-editable controls ───────────────────────────

function ReadOnlyItemList({ items }: { items: StockControlItem[] }) {
  if (items.length === 0) {
    return <Text style={styles.emptyItems}>Sin productos cargados</Text>;
  }

  return (
    <View style={styles.roList}>
      {items.map((item) => (
        <View key={item.id} style={styles.roItem}>
          <View style={styles.roItemHeader}>
            <Text style={styles.roItemName}>{item.productName}</Text>
            <Text style={styles.roItemCode}>{item.productCode}</Text>
          </View>
          <View style={styles.roItemQtys}>
            <Text style={styles.roQty}>Total <Text style={styles.roQtyVal}>{item.totalQuantity}</Text></Text>
            <Text style={styles.roQty}>Llenos <Text style={styles.roQtyVal}>{item.fullQuantity}</Text></Text>
            <Text style={styles.roQty}>Recamb. <Text style={styles.roQtyVal}>{item.exchangeQuantity}</Text></Text>
            {item.differenceQuantity != null && (
              <Text style={[styles.roQty, { color: item.differenceQuantity !== 0 ? C.danger : C.success }]}>
                Dif. <Text style={styles.roQtyVal}>{item.differenceQuantity}</Text>
              </Text>
            )}
          </View>
          {item.observations ? (
            <Text style={styles.roItemObs}>{item.observations}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function EditControlScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const keyboardHeight = useKeyboardHeight();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  // La barra de guardar es siempre visible, así que la lista siempre le deja lugar.
  const listPaddingBottom = 96 + insets.bottom;

  const [control, setControl] = useState<StockControl | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [formValues, setFormValues] = useState<Record<string, ProductControlValues>>({});
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Corrección (SUPERVISOR, controles ENTRY enviados/errados a Aguas)
  const [correcting, setCorrecting] = useState(false);
  const [startingCorrection, setStartingCorrection] = useState(false);
  const [reason, setReason] = useState('');
  const [truckOrdered, setTruckOrdered] = useState(true);

  const aguasRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (aguasRefreshTimeoutRef.current) {
        clearTimeout(aguasRefreshTimeoutRef.current);
      }
    };
  }, []);

  const loadProductsAndForm = useCallback(async (ctrl: StockControl) => {
    const prods = await getProducts();
    setProducts(prods);
    setFormValues(buildInitialFormValues(prods, ctrl.items));
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const ctrl = await getStockControl(id);
        setControl(ctrl);
        setObservations(ctrl.observations ?? '');
        setTruckOrdered(ctrl.truckOrdered);

        if (ctrl.status === 'CONTROLLED') {
          await loadProductsAndForm(ctrl);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar el control');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, loadProductsAndForm]);

  const handleProductChange = useCallback(
    (productId: string, values: ProductControlValues) => {
      setFormValues((prev) => ({ ...prev, [productId]: values }));
    },
    [],
  );

  async function handleSave() {
    if (!control) return;

    const items = buildItems(products, formValues);
    if (items.length === 0) {
      Alert.alert('Sin productos', 'Ingresá cantidades para al menos un producto');
      return;
    }

    setSaving(true);
    try {
      await updateStockControl(control.id, {
        observations: observations.trim() || undefined,
        items,
      });
      Alert.alert('Guardado', 'El control fue actualizado', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error al guardar', e instanceof Error ? e.message : 'Intentá de nuevo');
    } finally {
      setSaving(false);
    }
  }

  async function handleStartCorrection() {
    if (!control || startingCorrection) return;
    setReason('');
    setObservations(control.observations ?? '');
    setTruckOrdered(control.truckOrdered);
    // Los productos se cargan sólo la primera vez que hacen falta (edición normal o corrección).
    if (products.length === 0) {
      setStartingCorrection(true);
      try {
        await loadProductsAndForm(control);
        setCorrecting(true);
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'No se pudieron cargar los productos');
      } finally {
        setStartingCorrection(false);
      }
    } else {
      setFormValues(buildInitialFormValues(products, control.items));
      setCorrecting(true);
    }
  }

  function handleCancelCorrection() {
    if (!control) return;
    setCorrecting(false);
    setReason('');
    setObservations(control.observations ?? '');
    setTruckOrdered(control.truckOrdered);
  }

  async function handleConfirmCorrection() {
    if (!control) return;

    const trimmedReason = reason.trim();
    const reasonError = validateCorrectionReason(reason);
    if (reasonError) {
      const title = trimmedReason ? 'Motivo demasiado largo' : 'Falta el motivo';
      Alert.alert(title, reasonError);
      return;
    }

    const items = buildItems(products, formValues);
    if (items.length === 0) {
      Alert.alert('Sin productos', 'Ingresá cantidades para al menos un producto');
      return;
    }

    setSaving(true);
    try {
      const updated = await correctStockControl(control.id, {
        reason: trimmedReason,
        observations: observations.trim() || undefined,
        truckOrdered,
        items,
      });
      setControl(updated);
      setObservations(updated.observations ?? '');
      setCorrecting(false);
      setReason('');

      Alert.alert(
        'Control corregido',
        'La corrección se envió correctamente. El remito de Aguas puede tardar unos segundos en actualizarse.',
      );

      // El reenvío a Aguas es asíncrono en background: pedimos el control de nuevo
      // después de un breve delay para reflejar el remito/formulario actualizado.
      // El timer se guarda en un ref y se cancela en el cleanup del useEffect de
      // desmontaje para evitar setControl sobre un componente ya desmontado
      // (ej. el usuario navega hacia atrás antes de que venza el delay).
      if (aguasRefreshTimeoutRef.current) {
        clearTimeout(aguasRefreshTimeoutRef.current);
      }
      aguasRefreshTimeoutRef.current = setTimeout(() => {
        getStockControl(control.id)
          .then(setControl)
          .catch(() => {
            // Silencioso: si falla el refresco, el usuario ya ve el control recién corregido.
          });
      }, AGUAS_REFRESH_DELAY_MS);
    } catch (e) {
      Alert.alert('Error al corregir', e instanceof Error ? e.message : 'Intentá de nuevo');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Control' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </>
    );
  }

  if (error || !control) {
    return (
      <>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'Control no encontrado'}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const isEditable = control.status === 'CONTROLLED';
  const isExit = control.type === 'EXIT';
  const status = STATUS_LABELS[control.status] ?? { label: control.status, color: '#555' };
  const [cy, cm, cd] = control.controlDate.split('-');
  const dateFormatted = `${cd}/${cm}/${cy}`;
  const title = isExit ? 'Control de Salida' : 'Control de Entrada';
  const isCorrectable = isControlCorrectable(control, user?.role);
  const hasAguasInfo = !!control.aguasFormulario || control.aguasNroRemito != null;

  // ── Read-only view ──
  if (!isEditable && !correcting) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <View style={styles.container}>
          <FlatList
            data={[]}
            keyExtractor={() => ''}
            renderItem={null}
            ListHeaderComponent={
              <View>
                <View style={styles.headerBanner}>
                  <View style={[styles.typeBanner, isExit ? styles.exitBanner : styles.entryBanner]}>
                    <Text style={styles.typeBannerText}>{title}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: status.color }]}>
                    <Text style={styles.statusPillText}>{status.label}</Text>
                  </View>
                </View>

                <View style={styles.routeBox}>
                  <Text style={styles.routeCode}>Reparto {control.routeCode}</Text>
                  <Text style={styles.branchName}>{control.branchName}</Text>
                  <Text style={styles.controlDate}>{dateFormatted}</Text>
                </View>

                {hasAguasInfo ? (
                  <View style={styles.aguasBox}>
                    <View style={styles.aguasBoxHeader}>
                      <Ionicons name="water-outline" size={15} color={C.supervisor} />
                      <Text style={styles.aguasBoxLabel}>Datos de Aguas</Text>
                    </View>
                    {control.aguasFormulario ? (
                      <Text style={styles.aguasBoxText}>
                        Formulario <Text style={styles.aguasBoxValue}>{control.aguasFormulario}</Text>
                      </Text>
                    ) : null}
                    {control.aguasNroRemito != null ? (
                      <Text style={styles.aguasBoxText}>
                        Remito <Text style={styles.aguasBoxValue}>{control.aguasNroRemito}</Text>
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {control.observations ? (
                  <View style={styles.obsBox}>
                    <Text style={styles.obsBoxLabel}>Observaciones</Text>
                    <Text style={styles.obsBoxText}>{control.observations}</Text>
                  </View>
                ) : null}

                {isCorrectable && (
                  <TouchableOpacity
                    style={[styles.correctBtn, startingCorrection && styles.correctBtnDisabled]}
                    onPress={handleStartCorrection}
                    disabled={startingCorrection}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Corregir control"
                  >
                    {startingCorrection ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                        <Text style={styles.correctBtnText}>Corregir control</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                <Text style={styles.sectionTitle}>Productos ({control.items.length})</Text>
                <ReadOnlyItemList items={control.items} />
              </View>
            }
            contentContainerStyle={styles.list}
          />
        </View>
      </>
    );
  }

  // ── Editable view (edición normal o corrección) ──
  const EditHeader = (
    <View>
      <View style={styles.headerBanner}>
        <View style={[styles.typeBanner, isExit ? styles.exitBanner : styles.entryBanner]}>
          <Text style={styles.typeBannerText}>{title}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: status.color }]}>
          <Text style={styles.statusPillText}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.routeBox}>
        <Text style={styles.routeCode}>Reparto {control.routeCode}</Text>
        <Text style={styles.branchName}>{control.branchName}</Text>
        <Text style={styles.controlDate}>{dateFormatted}</Text>
      </View>

      {correcting && (
        <View style={styles.correctionModeBar}>
          <Ionicons name="shield-checkmark-outline" size={15} color="#fff" />
          <Text style={styles.correctionModeBarText}>MODO CORRECCIÓN</Text>
        </View>
      )}

      {correcting && (
        <View style={styles.correctionBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={C.supervisorDark} />
          <Text style={styles.correctionBannerText}>
            Estás corrigiendo un control ya enviado a Aguas. Esta acción queda
            auditada y los productos cargados reemplazan por completo a los actuales.
          </Text>
        </View>
      )}

      {correcting && (
        <>
          <TextInput
            style={[styles.observationsInput, styles.reasonInput]}
            placeholder="Motivo de la corrección (obligatorio)"
            placeholderTextColor={C.textMuted}
            value={reason}
            onChangeText={setReason}
            maxLength={REASON_MAX_LENGTH}
            multiline
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Camión ordenado</Text>
            <Switch
              value={truckOrdered}
              onValueChange={setTruckOrdered}
              trackColor={{ true: C.primary }}
            />
          </View>
        </>
      )}

      <TextInput
        style={styles.observationsInput}
        placeholder="Observaciones generales (opcional)"
        placeholderTextColor={C.textMuted}
        value={observations}
        onChangeText={setObservations}
        multiline
      />

      <Text style={styles.sectionTitle}>Productos</Text>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={C.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar producto..."
          placeholderTextColor={C.textMuted}
          value={productSearch}
          onChangeText={setProductSearch}
          autoCorrect={false}
          returnKeyType="search"
        />
        {productSearch.length > 0 && (
          <TouchableOpacity
            onPress={() => setProductSearch('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const searchQuery = normalizeText(productSearch.trim());
  const filteredProducts = searchQuery
    ? products.filter(
        (p) =>
          normalizeText(p.name).includes(searchQuery) ||
          normalizeText(p.code).includes(searchQuery),
      )
    : products;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <FlatList
          style={styles.flatList}
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductControlCard
              product={item}
              initialValues={formValues[item.id] ?? EMPTY_PRODUCT_VALUES}
              onChange={handleProductChange}
              controlType={control.type}
            />
          )}
          ListHeaderComponent={EditHeader}
          ListEmptyComponent={
            searchQuery ? (
              <Text style={styles.noResults}>
                Sin resultados para “{productSearch.trim()}”
              </Text>
            ) : null
          }
          contentContainerStyle={[styles.list, { paddingBottom: listPaddingBottom }]}
          keyboardShouldPersistTaps="handled"
        />

        <View
          style={[
            styles.stickyBar,
            { paddingBottom: keyboardHeight > 0 ? 12 : Math.max(insets.bottom, 14) },
          ]}
        >
          {correcting ? (
            <View style={styles.correctionActions}>
              <TouchableOpacity
                style={[styles.cancelBtn]}
                onPress={handleCancelCorrection}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, styles.correctionConfirmBtn, saving && styles.saveBtnDisabled]}
                onPress={handleConfirmCorrection}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Confirmar corrección</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  list: {
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: C.bg,
  },
  errorText: {
    color: C.danger,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 14,
  },
  retryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: C.primary,
    borderRadius: R.md,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Header
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    paddingBottom: 0,
  },
  typeBanner: {
    flex: 1,
    borderRadius: R.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  exitBanner: {
    backgroundColor: C.exit,
  },
  entryBanner: {
    backgroundColor: C.entry,
  },
  typeBannerText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  statusPill: {
    borderRadius: R.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },

  // Route info
  routeBox: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: R.lg,
    padding: 16,
    gap: 2,
    ...Shdw.card,
  },
  routeCode: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
  },
  branchName: {
    fontSize: 14,
    color: C.textSub,
  },
  controlDate: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 2,
  },

  // Aguas info — acento morado alineado al color del estado "Enviado a Aguas"
  // en STATUS_LABELS, para que se reconozca de un vistazo como info del
  // sistema externo (distinta de las observaciones internas del control).
  aguasBox: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: R.lg,
    borderLeftWidth: 3,
    borderLeftColor: C.supervisor,
    padding: 16,
    gap: 4,
    ...Shdw.card,
  },
  aguasBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  aguasBoxLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.supervisor,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  aguasBoxText: {
    fontSize: 14,
    color: C.textSub,
  },
  aguasBoxValue: {
    fontWeight: '700',
    color: C.text,
  },

  // Observations
  obsBox: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: R.lg,
    padding: 16,
    gap: 4,
    ...Shdw.card,
  },
  obsBoxLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  obsBoxText: {
    fontSize: 14,
    color: C.text,
  },
  observationsInput: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
    minHeight: 52,
    marginHorizontal: 16,
    marginTop: 12,
  },
  reasonInput: {
    borderColor: C.warning,
  },

  // Correct control (SUPERVISOR) — color "supervisor" (morado), no warning:
  // es una acción deliberada de rol elevado, no una alerta.
  correctBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.supervisor,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: R.lg,
    paddingVertical: 14,
    minHeight: 44,
    ...Shdw.card,
  },
  correctBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  correctBtnDisabled: {
    opacity: 0.55,
  },
  // Barra sólida que marca el modo corrección de forma inequívoca en el header
  // del formulario — más fuerte que el banner informativo de abajo, porque
  // corregir un control ya enviado a un sistema externo (con auditoría) es
  // un flujo distinto a la edición normal de un control recién creado.
  correctionModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.supervisor,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: R.md,
    paddingVertical: 8,
  },
  correctionModeBarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  correctionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.supervisorLight,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: R.lg,
    padding: 12,
  },
  correctionBannerText: {
    flex: 1,
    fontSize: 13,
    color: C.textSub,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  switchLabel: {
    fontSize: 15,
    color: C.text,
    fontWeight: '500',
  },
  correctionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: R.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceSunken,
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelBtnText: {
    color: C.textSub,
    fontSize: 16,
    fontWeight: '700',
  },
  correctionConfirmBtn: {
    flex: 2,
    backgroundColor: C.supervisor,
  },

  // Section title
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 44,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    paddingVertical: 0,
  },
  noResults: {
    textAlign: 'center',
    color: C.textMuted,
    fontSize: 14,
    marginTop: 24,
    paddingHorizontal: 16,
  },

  // Read-only items
  roList: {
    marginHorizontal: 16,
    gap: 10,
  },
  roItem: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 14,
    gap: 8,
    ...Shdw.card,
  },
  roItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    flex: 1,
  },
  roItemCode: {
    fontSize: 12,
    color: C.textMuted,
  },
  roItemQtys: {
    flexDirection: 'row',
    gap: 16,
  },
  roQty: {
    fontSize: 13,
    color: C.textSub,
  },
  roQtyVal: {
    fontWeight: '800',
    color: C.text,
  },
  roItemObs: {
    fontSize: 13,
    color: C.textMuted,
    fontStyle: 'italic',
  },
  emptyItems: {
    color: C.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: 16,
  },

  // Sticky bar
  flatList: {
    flex: 1,
  },
  stickyBar: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#172554',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  saveBtn: {
    backgroundColor: C.primary,
    borderRadius: R.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shdw.float,
  },
  saveBtnDisabled: {
    opacity: 0.55,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
});

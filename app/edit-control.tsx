import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getStockControl,
  updateStockControl,
  correctStockControl,
} from '@/features/stock-controls/services/stockControlApi';
import { getProducts } from '@/features/stock-controls/services/productsApi';
import { ProductControlCard } from '@/features/stock-controls/components/ProductControlCard';
import { ControlStatusChip } from '@/features/stock-controls/components/ControlStatusChip';
import { useAuthStore } from '@/store/authStore';
import {
  BLOCK_TONE,
  BottomBar,
  ColorBlock,
  EmptyState,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
} from '@/components/ui';
import { C, H, R, S, T } from '@/lib/theme';
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
import { isoDateToDisplay } from '@/lib/dateFormat';

const AGUAS_REFRESH_DELAY_MS = 2500;

// Primary button + vertical padding of the bottom bar, so the last row isn't hidden.
const BOTTOM_BAR_SPACE = H.primaryButton + S.md * 2 + S.lg;

function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ─── Read-only item list for non-editable controls ───────────────────────────

function ReadOnlyItemList({ items }: { items: StockControlItem[] }) {
  if (items.length === 0) {
    return <EmptyState icon="cube-outline" title="Sin productos cargados" style={styles.roEmpty} />;
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
            <Text style={styles.roQty}>Recambio <Text style={styles.roQtyVal}>{item.exchangeQuantity}</Text></Text>
            {item.differenceQuantity != null && (
              <Text
                style={[
                  styles.roQty,
                  { color: item.differenceQuantity !== 0 ? C.redText : C.greenDot },
                ]}
              >
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
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  // La barra de guardar es siempre visible, así que la lista siempre le deja lugar.
  const listPaddingBottom = BOTTOM_BAR_SPACE + insets.bottom;

  const [control, setControl] = useState<StockControl | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [formValues, setFormValues] = useState<Record<string, ProductControlValues>>({});
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Corrección (SUPERVISOR/ADMIN, controles ENTRY enviados/errados a Aguas)
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
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader title="Control" onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      </View>
    );
  }

  if (error || !control) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader title="Error" onBack={() => router.back()} />
        <View style={styles.centered}>
          <EmptyState
            icon="alert-circle-outline"
            title="No se pudo abrir el control"
            hint={error ?? 'Control no encontrado'}
          />
          <View style={styles.retryWrap}>
            <SecondaryButton title="Volver" icon="chevron-back" onPress={() => router.back()} />
          </View>
        </View>
      </View>
    );
  }

  const isEditable = control.status === 'CONTROLLED';
  const isExit = control.type === 'EXIT';
  const dateFormatted = isoDateToDisplay(control.controlDate);
  const title = isExit ? 'Control de Salida' : 'Control de Entrada';
  const isCorrectable = isControlCorrectable(control, user?.role);
  const hasAguasInfo = !!control.aguasFormulario || control.aguasNroRemito != null;
  // Direction color rule: EXIT = blue, ENTRY = green.
  const directionTone = isExit ? 'blue' : 'green';
  const directionColors = BLOCK_TONE[directionTone];

  const header = <ScreenHeader title={title} onBack={() => router.back()} />;

  const summaryBlock = (
    <ColorBlock tone={directionTone}>
      <View style={styles.summaryTop}>
        <Ionicons
          name={isExit ? 'arrow-up' : 'arrow-down'}
          size={H.icon}
          color={directionColors.fg}
        />
        <Text style={[styles.summaryTitle, { color: directionColors.fg }]}>{title}</Text>
      </View>
      <View>
        <Text style={[styles.routeCode, { color: directionColors.fg }]}>Reparto {control.routeCode}</Text>
        <Text style={[styles.branchName, { color: directionColors.fgSub }]}>{control.branchName}</Text>
        <Text style={[styles.controlDate, { color: directionColors.fgSub }]}>{dateFormatted}</Text>
      </View>
      <ControlStatusChip status={control.status} />
    </ColorBlock>
  );

  // ── Read-only view ──
  if (!isEditable && !correcting) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {header}
        <FlatList
          data={[]}
          keyExtractor={() => ''}
          renderItem={null}
          ListHeaderComponent={
            <View style={styles.headerContent}>
              {summaryBlock}

              {hasAguasInfo ? (
                <View style={styles.infoCard}>
                  <View style={styles.infoCardHeader}>
                    <Ionicons name="water-outline" size={H.iconInPill - 4} color={C.navy} />
                    <Text style={[styles.infoCardLabel, { color: C.navy }]}>Datos de Aguas</Text>
                  </View>
                  {control.aguasFormulario ? (
                    <Text style={styles.infoCardText}>
                      Formulario <Text style={styles.infoCardValue}>{control.aguasFormulario}</Text>
                    </Text>
                  ) : null}
                  {control.aguasNroRemito != null ? (
                    <Text style={styles.infoCardText}>
                      Remito <Text style={styles.infoCardValue}>{control.aguasNroRemito}</Text>
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {control.observations ? (
                <View style={styles.infoCard}>
                  <Text style={styles.infoCardLabel}>Observaciones</Text>
                  <Text style={styles.infoCardValueBlock}>{control.observations}</Text>
                </View>
              ) : null}

              <Text style={styles.sectionTitle} accessibilityRole="header">
                Productos ({control.items.length})
              </Text>
              <ReadOnlyItemList items={control.items} />
            </View>
          }
          contentContainerStyle={{
            paddingBottom: (isCorrectable ? BOTTOM_BAR_SPACE : S.xxl) + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
        />

        {isCorrectable && (
          <BottomBar>
            <View style={styles.flex}>
              <PrimaryButton
                title="Corregir control"
                icon="shield-checkmark-outline"
                onPress={handleStartCorrection}
                loading={startingCorrection}
              />
            </View>
          </BottomBar>
        )}
      </View>
    );
  }

  // ── Editable view (edición normal o corrección) ──
  const EditHeader = (
    <View style={styles.headerContent}>
      {summaryBlock}

      {correcting && (
        <View style={styles.correctionModeBar}>
          <Ionicons name="shield-checkmark-outline" size={H.iconInPill - 4} color={C.navy} />
          <Text style={styles.correctionModeBarText}>MODO CORRECCIÓN</Text>
        </View>
      )}

      {correcting && (
        <View style={styles.correctionBanner}>
          <Ionicons name="alert-circle-outline" size={H.iconInPill} color={C.orangeText} />
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
            placeholderTextColor={C.textFaint}
            value={reason}
            onChangeText={setReason}
            maxLength={REASON_MAX_LENGTH}
            multiline
            accessibilityLabel="Motivo de la corrección"
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Camión ordenado</Text>
            <Switch
              value={truckOrdered}
              onValueChange={setTruckOrdered}
              trackColor={{ true: C.blue }}
              accessibilityLabel="Camión ordenado"
            />
          </View>
        </>
      )}

      <TextInput
        style={styles.observationsInput}
        placeholder="Observaciones generales (opcional)"
        placeholderTextColor={C.textFaint}
        value={observations}
        onChangeText={setObservations}
        multiline
        accessibilityLabel="Observaciones generales"
      />

      <Text style={styles.sectionTitle} accessibilityRole="header">Productos</Text>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={H.icon} color={C.ink2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar producto..."
          placeholderTextColor={C.textFaint}
          value={productSearch}
          onChangeText={setProductSearch}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Buscar producto"
        />
        {productSearch.length > 0 && (
          <Pressable
            onPress={() => setProductSearch('')}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Borrar búsqueda"
          >
            <Ionicons name="close-circle" size={H.icon} color={C.ink2} />
          </Pressable>
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {header}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          style={styles.flex}
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
          contentContainerStyle={{ paddingBottom: listPaddingBottom }}
          keyboardShouldPersistTaps="handled"
        />

        <BottomBar>
          {correcting ? (
            <>
              <View style={styles.secondaryAction}>
                <SecondaryButton title="Cancelar" onPress={handleCancelCorrection} disabled={saving} />
              </View>
              <View style={styles.flex}>
                <PrimaryButton
                  title="Confirmar corrección"
                  onPress={handleConfirmCorrection}
                  loading={saving}
                />
              </View>
            </>
          ) : (
            <View style={styles.flex}>
              <PrimaryButton title="Guardar Cambios" onPress={handleSave} loading={saving} />
            </View>
          )}
        </BottomBar>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', padding: S.gutter, gap: S.lg },
  retryWrap: { alignSelf: 'center' },
  headerContent: { paddingHorizontal: S.gutter, gap: S.md },

  // Summary block (direction color)
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  summaryTitle: { ...T.label },
  routeCode: { ...T.blockTitle },
  branchName: { ...T.body },
  controlDate: { ...T.secondary },

  // White info cards (Aguas data, observations)
  infoCard: { backgroundColor: C.white, borderRadius: R.card, padding: S.lg, gap: S.xs },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: S.sm - 2 },
  infoCardLabel: { ...T.systemTag, color: C.ink2, textTransform: 'uppercase' },
  infoCardText: { ...T.body, color: C.ink2 },
  infoCardValue: { fontFamily: T.data.fontFamily, color: C.navy },
  infoCardValueBlock: { ...T.body, color: C.navy },

  // Inputs
  observationsInput: {
    ...T.body,
    backgroundColor: C.white,
    borderRadius: R.field,
    paddingHorizontal: S.xl - 3,
    paddingVertical: S.md,
    color: C.navy,
    minHeight: H.field,
  },
  reasonInput: { borderWidth: 3, borderColor: C.orange },

  // Correct control (SUPERVISOR/ADMIN): orange is LOOP's attention color — the edit is audited
  // and replaces what was already sent to Aguas.
  correctionModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm - 2,
    backgroundColor: C.orange,
    borderRadius: R.full,
    minHeight: H.touch,
  },
  correctionModeBarText: { ...T.systemTag, color: C.navy },
  correctionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S.sm,
    backgroundColor: C.orangeSoft,
    borderRadius: R.card,
    padding: S.lg,
  },
  correctionBannerText: { ...T.secondary, flex: 1, color: C.navy },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.white,
    borderRadius: R.field,
    paddingHorizontal: S.xl - 3,
    minHeight: H.field,
  },
  switchLabel: { ...T.label, color: C.navy },
  // The secondary action is always narrower than the primary one.
  secondaryAction: { flex: 0.75 },

  // Products
  sectionTitle: { ...T.section, color: C.navy, marginTop: S.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: C.white,
    borderRadius: R.field,
    paddingLeft: S.lg,
    paddingRight: S.sm,
    minHeight: H.field,
  },
  searchInput: { ...T.data, flex: 1, color: C.navy, paddingVertical: 0 },
  clearBtn: { width: H.touch, height: H.touch, alignItems: 'center', justifyContent: 'center' },
  noResults: {
    ...T.body,
    textAlign: 'center',
    color: C.ink2,
    marginTop: S.xxl,
    paddingHorizontal: S.gutter,
  },

  // Read-only items
  roList: { gap: S.sm },
  roEmpty: { paddingVertical: S.xl },
  roItem: { backgroundColor: C.white, borderRadius: R.row, padding: S.lg, gap: S.sm },
  roItemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm },
  roItemName: { ...T.label, color: C.navy, flex: 1 },
  roItemCode: { ...T.secondary, color: C.ink2 },
  roItemQtys: { flexDirection: 'row', flexWrap: 'wrap', gap: S.lg },
  roQty: { ...T.secondary, color: C.ink2 },
  roQtyVal: { fontFamily: T.data.fontFamily, color: C.navy },
  roItemObs: { ...T.secondary, color: C.ink2, fontStyle: 'italic' },
});

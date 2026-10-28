import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTextField } from '@/components/ui/AppTextField';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { C, H, R, S, T } from '@/lib/theme';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import type { Route } from '../types';
import { getAllRoutes } from '../services/routesApi';
import { filterRoutesByCode } from '../lib/routeSearch';

type Props = {
  visible: boolean;
  onSelect: (route: Route) => void;
  onClose: () => void;
};

const SEARCH_DEBOUNCE_MS = 300;

export function RouteSearchModal({ visible, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada búsqueda incrementa el id; solo la respuesta más reciente pisa el estado,
  // así una respuesta lenta de una búsqueda vieja no sobrescribe a la nueva.
  const reqId = useRef(0);

  const loadRoutes = useCallback(async (searchTerm: string) => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getAllRoutes(searchTerm);
      if (id === reqId.current) setRoutes(filterRoutesByCode(data, searchTerm));
    } catch (e) {
      if (id === reqId.current) {
        setError(e instanceof Error ? e.message : 'Error al cargar repartos');
      }
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  // Recarga desde el backend al abrir y cada vez que cambia el texto (con debounce).
  useEffect(() => {
    if (!visible) return;
    const handle = setTimeout(() => loadRoutes(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [visible, search, loadRoutes]);

  const handleSelect = useCallback(
    (route: Route) => {
      setSearch('');
      onSelect(route);
    },
    [onSelect]
  );

  // With the keyboard open the sheet sits on top of it; the safe-area inset is under the keyboard.
  const bottomSpace = keyboardHeight > 0 ? keyboardHeight + S.lg : insets.bottom + S.lg;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { paddingBottom: bottomSpace }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">Seleccionar Reparto</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={24} color={C.navy} />
            </TouchableOpacity>
          </View>

          <AppTextField
            surface="cream"
            icon="search"
            placeholder="Buscar por número de reparto..."
            value={search}
            onChangeText={setSearch}
            autoFocus
            clearButtonMode="while-editing"
            returnKeyType="search"
          />

          {loading && routes.length === 0 ? (
            <ActivityIndicator size="large" color={C.blue} style={styles.loader} />
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
              <SecondaryButton title="Reintentar" onPress={() => loadRoutes(search)} />
            </View>
          ) : (
            <FlatList
              data={routes}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Reparto ${item.code}, ${item.branchName}`}
                >
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemCode}>{item.code}</Text>
                    <Text style={styles.itemBranch}>{item.branchName}</Text>
                    {item.driverName ? (
                      <Text style={styles.itemDriver}>{item.driverName}</Text>
                    ) : null}
                  </View>
                  {item.truckPlate ? (
                    <View style={styles.plate}>
                      <Text style={styles.itemPlate}>{item.truckPlate}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <EmptyState
                  icon="search-outline"
                  title={search ? 'Sin resultados para la búsqueda' : 'No hay repartos disponibles'}
                />
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.scrim,
  },
  sheet: {
    height: '88%',
    backgroundColor: C.white,
    borderTopLeftRadius: R.sheet,
    borderTopRightRadius: R.sheet,
    paddingTop: S.md,
    paddingHorizontal: S.gutterWide,
    gap: S.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.handle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...T.sheetTitle,
    flex: 1,
    color: C.navy,
  },
  closeBtn: {
    width: H.touch,
    height: H.touch,
    borderRadius: H.touch / 2,
    backgroundColor: C.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginTop: S.xxxl,
  },
  centered: {
    alignItems: 'stretch',
    gap: S.lg,
    paddingTop: S.xl,
  },
  errorText: {
    ...T.body,
    color: C.redText,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: S.sm,
    paddingBottom: S.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: H.row,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    backgroundColor: C.cream,
    borderRadius: R.row,
  },
  itemLeft: {
    flex: 1,
  },
  itemCode: {
    ...T.data,
    color: C.navy,
    fontVariant: ['tabular-nums'],
  },
  itemBranch: {
    ...T.body,
    color: C.navy,
    marginTop: 2,
  },
  itemDriver: {
    ...T.secondary,
    color: C.ink2,
    marginTop: 1,
  },
  plate: {
    backgroundColor: C.white,
    borderRadius: R.cell,
    paddingHorizontal: S.md,
    height: H.statusCell,
    justifyContent: 'center',
    marginLeft: S.sm,
  },
  itemPlate: {
    ...T.secondary,
    fontFamily: T.button.fontFamily,
    color: C.navy,
    fontVariant: ['tabular-nums'],
  },
});

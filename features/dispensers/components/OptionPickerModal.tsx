import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AguasCatalogItem } from '../types';
import { C, H, R, S, T } from '@/lib/theme';

type Props = {
  visible: boolean;
  title: string;
  options: AguasCatalogItem[];
  selectedId: number | null;
  onSelect: (item: AguasCatalogItem) => void;
  onClose: () => void;
};

export function OptionPickerModal({
  visible,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Cerrar"
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={24} color={C.navy} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={options}
            keyExtractor={(item) => String(item.id)}
            style={styles.list}
            renderItem={({ item }) => {
              const selected = item.id === selectedId;
              return (
                <TouchableOpacity
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => onSelect(item)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {item.descripcion}
                  </Text>
                  {selected && <Ionicons name="checkmark-circle" size={24} color={C.blue} />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.empty}>No hay opciones disponibles</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: C.scrim },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: R.sheet,
    borderTopRightRadius: R.sheet,
    paddingHorizontal: S.gutterWide,
    paddingTop: S.md,
    maxHeight: '70%',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.handle,
    marginBottom: S.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: S.lg,
  },
  title: { ...T.sheetTitle, flex: 1, color: C.navy },
  closeBtn: {
    width: H.touch,
    height: H.touch,
    borderRadius: H.touch / 2,
    backgroundColor: C.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flexGrow: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: H.row,
    paddingHorizontal: S.lg - 3,
    borderRadius: R.row,
    backgroundColor: C.cream,
    marginBottom: S.sm,
    // Constant 3pt border so the selected ring doesn't shift the layout.
    borderWidth: 3,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: C.blue,
    backgroundColor: C.white,
  },
  optionText: { ...T.label, color: C.navy, flex: 1 },
  optionTextSelected: { color: C.blueText },
  empty: {
    ...T.body,
    textAlign: 'center',
    color: C.ink2,
    paddingVertical: S.xxl,
  },
});

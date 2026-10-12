import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { C, H, R, S, T } from '@/lib/theme';

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const DAYS_PER_WEEK = 7;
const COLUMN_WIDTH = `${100 / DAYS_PER_WEEK}%` as const;

type Props = {
  visible: boolean;
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
};

export function DatePickerModal({ visible, value, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [viewYear, setViewYear] = useState(() => value.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value.getMonth());

  function goToPrevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function goToNextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const days = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0=Dom
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Semana empieza en Lunes (offset Mon=0 ... Sun=6)
    const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const grid: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [viewYear, viewMonth]);

  function isSelected(day: number): boolean {
    return (
      value.getFullYear() === viewYear &&
      value.getMonth() === viewMonth &&
      value.getDate() === day
    );
  }

  function handleSelect(day: number) {
    onChange(new Date(viewYear, viewMonth, day));
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.container, { paddingBottom: insets.bottom + S.lg }]}
          onPress={() => {}}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <TouchableOpacity
              onPress={goToPrevMonth}
              style={styles.navBtn}
              accessibilityRole="button"
              accessibilityLabel="Mes anterior"
            >
              <Ionicons name="chevron-back" size={24} color={C.navy} />
            </TouchableOpacity>
            <Text style={styles.monthLabel} accessibilityRole="header">
              {MONTHS_ES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity
              onPress={goToNextMonth}
              style={styles.navBtn}
              accessibilityRole="button"
              accessibilityLabel="Mes siguiente"
            >
              <Ionicons name="chevron-forward" size={24} color={C.navy} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {DAYS_ES.map((d) => (
              <Text key={d} style={styles.weekDay}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {days.map((day, index) => {
              if (!day) return <View key={`e-${index}`} style={styles.cell} />;
              const selected = isSelected(day);
              return (
                <View key={day} style={styles.cell}>
                  <TouchableOpacity
                    style={[styles.dayBtn, selected && styles.dayBtnSelected]}
                    onPress={() => handleSelect(day)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${day} de ${MONTHS_ES[viewMonth]} ${viewYear}`}
                  >
                    <Text style={[styles.dayText, selected && styles.dayTextSelected]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <View style={styles.actions}>
            <SecondaryButton title="Cancelar" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: C.scrim,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: C.white,
    borderTopLeftRadius: R.sheet,
    borderTopRightRadius: R.sheet,
    paddingTop: S.md,
    paddingHorizontal: S.gutterWide,
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
    marginBottom: S.md,
  },
  navBtn: {
    width: H.touch,
    height: H.touch,
    borderRadius: H.touch / 2,
    backgroundColor: C.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    ...T.section,
    color: C.navy,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: S.xs,
  },
  weekDay: {
    width: COLUMN_WIDTH,
    textAlign: 'center',
    ...T.systemTag,
    color: C.ink2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: COLUMN_WIDTH,
    height: H.touch + S.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBtn: {
    width: H.touch,
    height: H.touch,
    borderRadius: H.touch / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBtnSelected: {
    backgroundColor: C.blue,
  },
  dayText: {
    ...T.data,
    color: C.navy,
    fontVariant: ['tabular-nums'],
  },
  dayTextSelected: {
    color: C.white,
  },
  actions: {
    marginTop: S.md,
  },
});

import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

type Props = {
  visible: boolean;
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
};

export function DatePickerModal({ visible, value, onChange, onClose }: Props) {
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.container} onPress={() => {}}>
          <View style={styles.header}>
            <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn}>
              <Text style={styles.navText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTHS_ES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
              <Text style={styles.navText}>›</Text>
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
                <TouchableOpacity
                  key={day}
                  style={[styles.cell, selected && styles.cellSelected]}
                  onPress={() => handleSelect(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const CELL = 40;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: CELL * 7 + 32, // 7 columnas + padding (16 x 2), así entra la columna Dom
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    padding: 8,
  },
  navText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '600',
    lineHeight: 26,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekDay: {
    width: CELL,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#aaa',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CELL / 2,
  },
  cellSelected: {
    backgroundColor: '#007AFF',
  },
  dayText: {
    fontSize: 16,
    color: '#111',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
});

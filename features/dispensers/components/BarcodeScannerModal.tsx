import { useRef, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type BarcodeType,
} from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import { normalizeSerial } from '../services/dispenserValidationApi';
import { C, R, S, F, W } from '@/lib/theme';

type Props = {
  visible: boolean;
  /** Seriales ya agregados; sirve para avisar duplicados. */
  existingSerials: string[];
  /** Seriales "no registrados" en Aguas (normalizados): se rechazan al escanear. */
  invalidSerials?: Set<string>;
  /** Se llama con cada serial nuevo escaneado. */
  onAdd: (serial: string) => void;
  onClose: () => void;
};

type Feedback = { type: 'ok' | 'dup' | 'invalid'; code: string } | null;

const FRAME_W = 264;
const FRAME_H = 172;

const BARCODE_TYPES: BarcodeType[] = [
  'qr',
  'ean13',
  'ean8',
  'code128',
  'code39',
  'code93',
  'codabar',
  'itf14',
  'upc_a',
  'upc_e',
  'datamatrix',
  'pdf417',
];

export function BarcodeScannerModal({
  visible,
  existingSerials,
  invalidSerials,
  onAdd,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  // Dentro de un Modal, Android no aplica adjustResize: subimos la barra a mano
  // para que el teclado no tape el input de carga manual.
  const keyboardHeight = useKeyboardHeight();
  const [permission, requestPermission] = useCameraPermissions();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [torch, setTorch] = useState(false);
  const [recent, setRecent] = useState<{ code: string; invalid: boolean }[]>([]);
  // Carga manual dentro del escáner (dispensers sin código de barras).
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');

  const lastRef = useRef<{ value: string; t: number }>({ value: '', t: 0 });
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanLine = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;

  const count = existingSerials.length;

  // Línea de escaneo animada mientras la cámara está activa.
  useEffect(() => {
    if (!visible || !permission?.granted) return;
    scanLine.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, permission?.granted, scanLine]);

  // Limpia el estado efímero al cerrar.
  useEffect(() => {
    if (!visible) {
      setRecent([]);
      setFeedback(null);
      setTorch(false);
      setManualOpen(false);
      setManualValue('');
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  function flashFrame() {
    flash.setValue(1);
    Animated.timing(flash, {
      toValue: 0,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }

  function showFeedback(next: Feedback) {
    setFeedback(next);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 1400);
  }

  // Agrega un código (venga del escáner o de la carga manual). Devuelve true si se agregó.
  function commitCode(raw: string): boolean {
    const code = raw.replace(/\s+/g, ''); // saca todos los espacios (puntas e internos)
    if (!code) return false;

    if (existingSerials.includes(code)) {
      Vibration.vibrate(70);
      showFeedback({ type: 'dup', code });
      return false;
    }

    // No registrado en Aguas: se agrega igual, pero marcado en rojo (no se enviará).
    const invalid = invalidSerials?.has(normalizeSerial(code)) ?? false;

    Vibration.vibrate(invalid ? [0, 90, 70, 90] : 35);
    flashFrame();
    onAdd(code);
    setRecent((prev) => [{ code, invalid }, ...prev.filter((r) => r.code !== code)].slice(0, 4));
    showFeedback({ type: invalid ? 'invalid' : 'ok', code });
    return true;
  }

  function handleScan(res: BarcodeScanningResult) {
    const code = res.data?.trim();
    if (!code) return;

    const now = Date.now();
    if (code === lastRef.current.value && now - lastRef.current.t < 2000) return;
    lastRef.current = { value: code, t: now };

    commitCode(code);
  }

  function handleManualAdd() {
    if (commitCode(manualValue)) setManualValue('');
  }

  const lineTranslate = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [6, FRAME_H - 6],
  });
  const frameBorderColor = flash.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.85)', C.entry],
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {visible && permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
            onBarcodeScanned={manualOpen ? undefined : handleScan}
          />
        ) : (
          <View style={styles.permissionWrap}>
            <Ionicons name="camera-outline" size={54} color="rgba(255,255,255,0.7)" />
            <Text style={styles.permissionTitle}>Permiso de cámara</Text>
            <Text style={styles.permissionSub}>
              Necesitamos la cámara para escanear los códigos de los dispensers.
            </Text>
            {permission && !permission.granted && (
              <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                <Text style={styles.permissionBtnText}>Permitir cámara</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Oscurecido de bordes para enfocar el marco */}
        {permission?.granted && <View pointerEvents="none" style={styles.scrim} />}

        {/* Top bar: contador + linterna + cerrar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <View style={styles.counter}>
            <Ionicons name="cube" size={16} color="#fff" />
            <Text style={styles.counterText}>{count}</Text>
            <Text style={styles.counterLabel}>escaneados</Text>
          </View>
          <View style={styles.topActions}>
            {permission?.granted && (
              <TouchableOpacity
                style={[styles.iconBtn, torch && styles.iconBtnActive]}
                onPress={() => setTorch((t) => !t)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Marco con esquinas + línea animada */}
        {permission?.granted && (
          <View pointerEvents="none" style={styles.frameWrap}>
            <Animated.View style={[styles.frame, { borderColor: frameBorderColor }]}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <Animated.View
                style={[styles.scanLine, { transform: [{ translateY: lineTranslate }] }]}
              />
            </Animated.View>
            <Text style={styles.hint}>Apuntá al código de barras del dispenser</Text>
          </View>
        )}

        {/* Feedback del último escaneo */}
        {feedback && (
          <View
            style={[
              styles.feedback,
              { bottom: keyboardHeight + insets.bottom + 150 },
              feedback.type === 'ok'
                ? styles.feedbackOk
                : feedback.type === 'invalid'
                  ? styles.feedbackInvalid
                  : styles.feedbackDup,
            ]}
          >
            <Ionicons
              name={
                feedback.type === 'ok'
                  ? 'checkmark-circle'
                  : feedback.type === 'invalid'
                    ? 'close-circle'
                    : 'alert-circle'
              }
              size={18}
              color="#fff"
            />
            <Text style={styles.feedbackText} numberOfLines={1}>
              {feedback.type === 'ok'
                ? 'Agregado: '
                : feedback.type === 'invalid'
                  ? 'Dispenser inexistente: '
                  : 'Ya escaneado: '}
              {feedback.code}
            </Text>
          </View>
        )}

        {/* Panel inferior: escaneo (recientes + botones) o carga manual */}
        <View
          style={[
            styles.bottomBar,
            {
              bottom: keyboardHeight,
              paddingBottom: keyboardHeight > 0 ? 14 : insets.bottom + 14,
            },
          ]}
        >
          {manualOpen ? (
            <>
              <View style={styles.manualPanel}>
                <Ionicons name="create-outline" size={20} color={C.textMuted} />
                <TextInput
                  style={styles.manualInput}
                  value={manualValue}
                  onChangeText={setManualValue}
                  placeholder="Código del dispenser sin barra"
                  placeholderTextColor={C.textFaint}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleManualAdd}
                />
                <TouchableOpacity
                  style={[styles.manualAddBtn, !manualValue.trim() && styles.manualAddBtnOff]}
                  onPress={handleManualAdd}
                  disabled={!manualValue.trim()}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.backToScanBtn}
                onPress={() => { setManualOpen(false); setManualValue(''); }}
                activeOpacity={0.85}
              >
                <Ionicons name="barcode-outline" size={18} color="#fff" />
                <Text style={styles.backToScanText}>Volver a escanear</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {recent.length > 0 && (
                <View style={styles.recentRow}>
                  {recent.map((r) => (
                    <View key={r.code} style={[styles.recentChip, r.invalid && styles.recentChipInvalid]}>
                      <Ionicons
                        name={r.invalid ? 'close-circle' : 'checkmark'}
                        size={12}
                        color={r.invalid ? '#fff' : C.entry}
                      />
                      <Text
                        style={[styles.recentChipText, r.invalid && styles.recentChipTextInvalid]}
                        numberOfLines={1}
                      >
                        {r.code}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={styles.manualToggle}
                onPress={() => setManualOpen(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.manualToggleText}>Sin código de barras · escribir a mano</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
                <Ionicons name="checkmark-done" size={20} color={C.text} />
                <Text style={styles.doneBtnText}>
                  Listo{count > 0 ? ` · ${count} dispenser${count !== 1 ? 's' : ''}` : ''}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const CORNER = 28;
const CORNER_W = 3;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },

  permissionWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S.xxl,
    gap: S.md,
  },
  permissionTitle: { color: '#fff', fontSize: F.lg, fontWeight: W.extra },
  permissionSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: F.sm + 1,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionBtn: {
    marginTop: S.sm,
    backgroundColor: C.primary,
    borderRadius: R.md,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  permissionBtnText: { color: '#fff', fontSize: F.md, fontWeight: W.bold },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: R.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  counterText: { color: '#fff', fontSize: F.md, fontWeight: W.extra },
  counterLabel: { color: 'rgba(255,255,255,0.75)', fontSize: F.sm, fontWeight: W.semibold },
  topActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: R.full,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: { backgroundColor: C.warning },

  frameWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_W,
    height: FRAME_H,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: R.lg,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#fff',
  },
  cornerTL: { top: -1, left: -1, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W, borderTopLeftRadius: R.lg },
  cornerTR: { top: -1, right: -1, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W, borderTopRightRadius: R.lg },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W, borderBottomLeftRadius: R.lg },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W, borderBottomRightRadius: R.lg },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: C.primaryGlow,
    shadowColor: C.primaryGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  hint: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: F.sm + 1,
    fontWeight: W.semibold,
    marginTop: 18,
    textAlign: 'center',
    paddingHorizontal: 30,
  },

  feedback: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  feedbackOk: { backgroundColor: C.entry },
  feedbackDup: { backgroundColor: C.warning },
  feedbackInvalid: { backgroundColor: C.danger },
  feedbackText: { flex: 1, color: '#fff', fontSize: F.sm + 1, fontWeight: W.bold },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  recentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: R.full,
    paddingLeft: 8,
    paddingRight: 12,
    paddingVertical: 5,
    maxWidth: 150,
  },
  recentChipText: { fontSize: F.xs + 1, fontWeight: W.bold, color: C.text },
  recentChipInvalid: { backgroundColor: C.danger },
  recentChipTextInvalid: { color: '#fff' },

  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: R.lg,
    paddingVertical: 16,
  },
  doneBtnText: { color: C.text, fontSize: F.md, fontWeight: W.extra },

  // Toggle "escribir a mano"
  manualToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: R.lg,
    paddingVertical: 12,
  },
  manualToggleText: { color: '#fff', fontSize: F.sm + 1, fontWeight: W.bold },

  // Panel de carga manual dentro del escáner
  manualPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: R.lg,
    paddingLeft: 14,
    paddingRight: 6,
    height: 56,
  },
  manualInput: {
    flex: 1,
    fontSize: F.md,
    fontWeight: W.semibold,
    color: C.text,
    paddingVertical: 0,
  },
  manualAddBtn: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualAddBtnOff: { backgroundColor: C.borderStrong },
  backToScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  backToScanText: { color: '#fff', fontSize: F.sm + 1, fontWeight: W.bold },
});

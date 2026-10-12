import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
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
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import { useBarcodeCommit, type FeedbackKind } from '../hooks/useBarcodeCommit';
import { getFrameRect, isWithinFrame } from '../lib/scanRegion';
import { PrimaryButton } from '@/components/ui';
import { C, H, R, S, T } from '@/lib/theme';

const SCAN_OK_SOUND = require('@/assets/sounds/scan-ok.wav');
const SCAN_ERROR_SOUND = require('@/assets/sounds/scan-error.wav');

type Props = {
  visible: boolean;
  /** Seriales ya agregados; sirve para avisar duplicados. */
  existingSerials: string[];
  /** Seriales no normalizados según jMobile (normalizados para comparar): se marcan al escanear. */
  invalidSerials?: Set<string>;
  /**
   * Prefijo del feedback cuando el serial está en `invalidSerials`. En descargas no es un
   * rechazo (el no normalizado se deriva a Odoo), así que la pantalla puede ajustar el texto.
   */
  invalidFeedbackLabel?: string;
  /** Se llama con cada serial nuevo escaneado. */
  onAdd: (serial: string) => void;
  onClose: () => void;
};

const DEFAULT_INVALID_FEEDBACK_LABEL = 'No normalizado: ';

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
  invalidFeedbackLabel = DEFAULT_INVALID_FEEDBACK_LABEL,
  onAdd,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  // Dentro de un Modal, Android no aplica adjustResize: subimos la barra a mano
  // para que el teclado no tape el input de carga manual.
  const keyboardHeight = useKeyboardHeight();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  // Carga manual dentro del escáner (dispensers sin código de barras).
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');
  // Tamaño real de la cámara en pantalla (se conoce recién con onLayout); se
  // usa para ubicar el recuadro de escaneo y filtrar lecturas fuera de él.
  const [cameraSize, setCameraSize] = useState({ width: 0, height: 0 });

  const scanLine = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const okPlayerRef = useRef<AudioPlayer | null>(null);
  const errorPlayerRef = useRef<AudioPlayer | null>(null);

  const count = existingSerials.length;

  // Precarga los sonidos de feedback (ok/error) y habilita reproducción con el
  // teléfono en silencio. Se libera al desmontar; nunca debe bloquear el escaneo.
  useEffect(() => {
    try {
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
      okPlayerRef.current = createAudioPlayer(SCAN_OK_SOUND);
      errorPlayerRef.current = createAudioPlayer(SCAN_ERROR_SOUND);
    } catch {
      okPlayerRef.current = null;
      errorPlayerRef.current = null;
    }
    return () => {
      try {
        okPlayerRef.current?.remove();
        errorPlayerRef.current?.remove();
      } catch {
        // noop: liberar el player no debe romper el desmontaje del modal
      }
      okPlayerRef.current = null;
      errorPlayerRef.current = null;
    };
  }, []);

  // Reproduce el sonido de feedback correspondiente al resultado del escaneo.
  // La garantía de "no bloquear el flujo de escaneo si esto falla" la da
  // `useBarcodeCommit` (envuelve esta llamada en try/catch); acá solo
  // absorbemos el rechazo async de `seekTo` para no dejar una unhandled
  // rejection colgada.
  const playFeedbackSound = useCallback((type: FeedbackKind) => {
    const player = type === 'ok' ? okPlayerRef.current : errorPlayerRef.current;
    if (!player) return;
    player.seekTo(0).catch(() => {});
    player.play();
  }, []);

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

  const flashFrame = useCallback(() => {
    flash.setValue(1);
    Animated.timing(flash, {
      toValue: 0,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [flash]);

  const vibrate = useCallback((pattern: number | number[]) => {
    Vibration.vibrate(pattern);
  }, []);

  const { feedback, recent, commitCode, handleScan: handleBarcodeScan, reset } = useBarcodeCommit({
    existingSerials,
    invalidSerials,
    onAdd,
    playFeedbackSound,
    vibrate,
    flashFrame,
  });

  // Limpia el estado efímero al cerrar.
  useEffect(() => {
    if (!visible) {
      reset();
      setTorch(false);
      setManualOpen(false);
      setManualValue('');
    }
  }, [visible, reset]);

  function handleScan(res: BarcodeScanningResult) {
    // Filtra lecturas fuera del recuadro visual. Si todavía no llegó el
    // layout de la cámara (tamaño 0) no filtramos, para no perder lecturas
    // iniciales; el código fuera del recuadro se ignora en silencio.
    if (cameraSize.width > 0 && cameraSize.height > 0) {
      const rect = getFrameRect(cameraSize.width, cameraSize.height, FRAME_W, FRAME_H);
      if (!isWithinFrame(res, rect)) return;
    }
    handleBarcodeScan(res.data);
  }

  function handleManualAdd() {
    if (commitCode(manualValue)) setManualValue('');
  }

  const lineTranslate = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [6, FRAME_H - 6],
  });
  // The flash on each read tints the frame for a moment; a warning keeps it tinted.
  const restColor = feedback ? FEEDBACK_TONE[feedback.type].bg : C.green;
  const cornerColor = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [restColor, C.white],
  });

  const feedbackPill = feedback ? (
    <View
      style={[styles.feedback, { backgroundColor: FEEDBACK_TONE[feedback.type].bg }]}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.feedbackIcon, { backgroundColor: FEEDBACK_TONE[feedback.type].iconBg }]}>
        <Ionicons
          name={FEEDBACK_TONE[feedback.type].icon}
          size={18}
          color={FEEDBACK_TONE[feedback.type].iconFg}
        />
      </View>
      <Text style={[styles.feedbackText, { color: FEEDBACK_TONE[feedback.type].fg }]}>
        {feedback.type === 'ok'
          ? 'Agregado: '
          : feedback.type === 'invalid'
            ? invalidFeedbackLabel
            : 'Ya escaneado: '}
        <Text style={styles.feedbackCode}>{feedback.code}</Text>
      </Text>
    </View>
  ) : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={styles.root}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setCameraSize({ width, height });
        }}
      >
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
            <View style={styles.permissionIcon}>
              <Ionicons name="camera-outline" size={30} color={C.navy} />
            </View>
            <Text style={styles.permissionTitle}>Permiso de cámara</Text>
            <Text style={styles.permissionSub}>
              Necesitamos la cámara para escanear los códigos de los dispensers.
            </Text>
            {permission && !permission.granted && (
              <View style={styles.permissionBtn}>
                <PrimaryButton title="Permitir cámara" icon="camera-outline" onPress={requestPermission} variant="soft" />
              </View>
            )}
          </View>
        )}

        {/* Darkens everything outside the frame. The frame is exactly centered,
            which is where getFrameRect looks for codes. */}
        {permission?.granted && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={styles.scrim} />
            <View style={styles.scrimRow}>
              <View style={styles.scrim} />
              <View style={styles.hole} />
              <View style={styles.scrim} />
            </View>
            <View style={styles.scrim} />
          </View>
        )}

        {/* Top bar: counter + torch + close */}
        <View style={[styles.topBar, { paddingTop: insets.top + S.sm }]}>
          <View style={styles.counter} accessibilityLabel={`${count} escaneados`}>
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>{count}</Text>
            </View>
            <Text style={styles.counterLabel}>escaneados</Text>
          </View>
          <View style={styles.topActions}>
            {permission?.granted && (
              <Pressable
                style={[styles.iconBtn, torch && styles.iconBtnActive]}
                onPress={() => setTorch((t) => !t)}
                hitSlop={S.sm}
                accessibilityRole="button"
                accessibilityLabel={torch ? 'Apagar linterna' : 'Encender linterna'}
              >
                <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={H.icon - 2} color={C.navy} />
              </Pressable>
            )}
            <Pressable
              style={styles.iconBtn}
              onPress={onClose}
              hitSlop={S.sm}
              accessibilityRole="button"
              accessibilityLabel="Cerrar escáner"
            >
              <Ionicons name="close" size={H.icon} color={C.navy} />
            </Pressable>
          </View>
        </View>

        {/* Frame with corners + animated line; the result pill and the hint hang below it */}
        {permission?.granted && (
          <View pointerEvents="none" style={styles.frameWrap}>
            <View style={styles.frame}>
              <Animated.View style={[styles.corner, styles.cornerTL, { borderColor: cornerColor }]} />
              <Animated.View style={[styles.corner, styles.cornerTR, { borderColor: cornerColor }]} />
              <Animated.View style={[styles.corner, styles.cornerBL, { borderColor: cornerColor }]} />
              <Animated.View style={[styles.corner, styles.cornerBR, { borderColor: cornerColor }]} />
              {!feedback || feedback.type === 'ok' ? (
                <Animated.View
                  style={[styles.scanLine, { transform: [{ translateY: lineTranslate }] }]}
                />
              ) : null}

              <View style={styles.belowFrame}>
                {feedbackPill}
                <Text style={styles.hint}>Apuntá al código de barras del dispenser</Text>
              </View>
            </View>
          </View>
        )}

        {/* Bottom panel: scanning (recent + buttons) or manual entry */}
        <View
          style={[
            styles.bottomBar,
            {
              bottom: keyboardHeight,
              paddingBottom: keyboardHeight > 0 ? S.md + 2 : insets.bottom + S.xxl - 4,
            },
          ]}
        >
          {/* Without camera there is no frame to hang the result from, e.g. for codes typed by hand */}
          {!permission?.granted && feedbackPill ? <View style={styles.feedbackStandalone}>{feedbackPill}</View> : null}
          {manualOpen ? (
            <>
              <View style={styles.manualPanel}>
                <Ionicons name="create-outline" size={22} color={C.ink2} />
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
                <Pressable
                  style={[styles.manualAddBtn, !manualValue.trim() && styles.manualAddBtnOff]}
                  onPress={handleManualAdd}
                  disabled={!manualValue.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Agregar código"
                >
                  <Ionicons name="add" size={H.icon} color={C.white} />
                </Pressable>
              </View>
              <Pressable
                style={styles.outlineBtn}
                onPress={() => { setManualOpen(false); setManualValue(''); }}
                accessibilityRole="button"
              >
                <Ionicons name="barcode-outline" size={20} color={C.white} />
                <Text style={styles.outlineBtnText}>Volver a escanear</Text>
              </Pressable>
            </>
          ) : (
            <>
              {recent.length > 0 && (
                <View style={styles.recentRow}>
                  {recent.map((r) => (
                    <View key={r.code} style={[styles.recentChip, r.invalid && styles.recentChipInvalid]}>
                      <Ionicons
                        name={r.invalid ? 'close' : 'checkmark'}
                        size={12}
                        color={r.invalid ? C.white : C.greenDot}
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
              <Pressable
                style={styles.outlineBtn}
                onPress={() => setManualOpen(true)}
                accessibilityRole="button"
              >
                <Ionicons name="create-outline" size={20} color={C.white} />
                <Text style={styles.outlineBtnText}>Sin código de barras · escribir a mano</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}
                onPress={onClose}
                accessibilityRole="button"
              >
                <Ionicons name="checkmark" size={H.icon} color={C.navy} />
                <Text style={styles.doneBtnText}>
                  Listo{count > 0 ? ` · ${count} dispenser${count !== 1 ? 's' : ''}` : ''}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const FEEDBACK_TONE: Record<
  FeedbackKind,
  { bg: string; fg: string; iconBg: string; iconFg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  ok: { bg: C.green, fg: C.navy, iconBg: C.navy, iconFg: C.green, icon: 'checkmark' },
  dup: { bg: C.orange, fg: C.navy, iconBg: C.navy, iconFg: C.orange, icon: 'alert' },
  invalid: { bg: C.red, fg: C.white, iconBg: C.white, iconFg: C.red, icon: 'close' },
};

const CORNER = 44;
const CORNER_W = 5;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.navy },
  pressed: { opacity: 0.9 },

  scrim: { flex: 1, backgroundColor: C.cameraScrim },
  scrimRow: { height: FRAME_H, flexDirection: 'row' },
  hole: { width: FRAME_W },

  permissionWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S.xxl,
    gap: S.md,
  },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: { ...T.screenTitle, color: C.white },
  permissionSub: { ...T.body, color: C.onNavyMuted, textAlign: 'center' },
  permissionBtn: { alignSelf: 'stretch', marginTop: S.sm },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.gutter,
    paddingBottom: S.sm,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md - 2,
    height: H.circleButton,
    paddingLeft: S.sm + 2,
    paddingRight: S.xl - 2,
    borderRadius: H.circleButton / 2,
    backgroundColor: C.white,
  },
  counterBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: S.xs + 2,
    borderRadius: 15,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: { ...T.label, fontFamily: T.button.fontFamily, color: C.navy, fontVariant: ['tabular-nums'] },
  counterLabel: { ...T.label, fontSize: T.body.fontSize, color: C.navy },
  topActions: { flexDirection: 'row', gap: S.sm },
  iconBtn: {
    width: H.circleButton,
    height: H.circleButton,
    borderRadius: H.circleButton / 2,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: { backgroundColor: C.orange },

  frameWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_W,
    height: FRAME_H,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
  },
  cornerTL: { top: -CORNER_W, left: -CORNER_W, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W, borderTopLeftRadius: R.block },
  cornerTR: { top: -CORNER_W, right: -CORNER_W, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W, borderTopRightRadius: R.block },
  cornerBL: { bottom: -CORNER_W, left: -CORNER_W, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W, borderBottomLeftRadius: R.block },
  cornerBR: { bottom: -CORNER_W, right: -CORNER_W, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W, borderBottomRightRadius: R.block },
  scanLine: {
    position: 'absolute',
    left: S.xl,
    right: S.xl,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.green,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  // Hangs below the frame without moving it off center.
  belowFrame: {
    position: 'absolute',
    top: FRAME_H + S.xl + CORNER_W,
    left: -S.xxxl,
    right: -S.xxxl,
    alignItems: 'center',
    gap: S.lg,
  },
  hint: { ...T.label, fontSize: 17, lineHeight: 24, color: C.white, textAlign: 'center' },

  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    minHeight: H.circleButton,
    maxWidth: '100%',
    paddingVertical: S.xs,
    paddingLeft: S.xs + 2,
    paddingRight: S.xl,
    borderRadius: H.circleButton / 2,
  },
  feedbackIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackText: { ...T.label, flexShrink: 1 },
  feedbackStandalone: { alignItems: 'center' },
  feedbackCode: { fontFamily: T.button.fontFamily, fontVariant: ['tabular-nums'] },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: S.gutter,
    paddingTop: S.md,
    gap: S.md - 2,
  },
  recentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S.xs + 2,
    justifyContent: 'center',
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    backgroundColor: C.white,
    borderRadius: R.full,
    paddingLeft: S.sm,
    paddingRight: S.md,
    paddingVertical: 5,
    maxWidth: 160,
  },
  recentChipText: { ...T.secondary, fontFamily: T.label.fontFamily, color: C.navy },
  recentChipInvalid: { backgroundColor: C.red },
  recentChipTextInvalid: { color: C.white },

  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.md,
    height: H.secondaryButton - 2,
    borderRadius: (H.secondaryButton - 2) / 2,
    borderWidth: 2,
    borderColor: C.white,
    paddingHorizontal: S.lg,
  },
  outlineBtnText: { ...T.label, fontSize: T.body.fontSize, color: C.white, flexShrink: 1 },

  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.md - 2,
    height: H.primaryButton,
    borderRadius: H.primaryButton / 2,
    backgroundColor: C.white,
  },
  doneBtnText: { ...T.button, color: C.navy },

  manualPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.white,
    borderRadius: R.field,
    paddingLeft: S.lg + 2,
    paddingRight: S.sm,
    height: H.field,
  },
  manualInput: {
    flex: 1,
    fontFamily: T.label.fontFamily,
    fontSize: T.body.fontSize,
    color: C.navy,
    paddingVertical: 0,
  },
  manualAddBtn: {
    width: H.touch,
    height: H.touch,
    borderRadius: H.touch / 2,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualAddBtnOff: { opacity: 0.35 },
});

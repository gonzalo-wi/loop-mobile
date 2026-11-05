import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BLOCK_TONE, CircleButton, ColorBlock, EmptyState, ScreenHeader, SecondaryButton } from '@/components/ui';
import { useSettlement } from '@/features/settlement/hooks/useSettlement';
import { formatMoney, STATE_MESSAGE, statusLabel } from '@/features/settlement/lib/format';
import { leadOf, officialReview } from '@/features/settlement/lib/lead';
import type { RouteSettlement, SettlementFigures } from '@/features/settlement/types';
import { formatClockTime, isoDateToDisplay } from '@/lib/dateFormat';
import { C, F, H, R, S, T } from '@/lib/theme';

export default function SettlementScreen() {
  const insets = useSafeAreaInsets();
  const { data, loading, refreshing, error, refresh, retry } = useSettlement();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Mi rendición"
        subtitle={data ? `Hoy ${isoDateToDisplay(data.date)}` : 'Lo que espera Aguas y lo que depositaste'}
        right={<CircleButton icon="refresh" onPress={refresh} accessibilityLabel="Actualizar rendición" />}
      />

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.navy} />}
      >
        {loading && !data && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={C.navy} />
            <Text style={styles.loadingText}>Consultando tesorería...</Text>
          </View>
        )}

        {!loading && error && !data && (
          <>
            <EmptyState icon="cloud-offline-outline" title="No se pudo cargar" hint={error} />
            <View style={styles.retryWrap}>
              <SecondaryButton title="Reintentar" icon="refresh" onPress={retry} />
            </View>
          </>
        )}

        {error && data && <Text style={styles.staleNote}>{error}</Text>}

        {data && data.routes.length === 0 && (
          <EmptyState
            icon="map-outline"
            title="Sin reparto asignado"
            hint="No tenés repartos asignados. Si es un error, avisale al administrador."
          />
        )}

        {data?.routes.map((route) => <RouteCard key={route.routeId} route={route} />)}
      </ScrollView>
    </View>
  );
}

function RouteCard({ route }: { route: RouteSettlement }) {
  if (route.state !== 'AVAILABLE' || !route.figures) {
    const message = STATE_MESSAGE[route.state === 'AVAILABLE' ? 'UNAVAILABLE' : route.state];
    return (
      <View style={styles.card}>
        <Text style={styles.routeTag}>{route.routeCode.toUpperCase()}</Text>
        <Text style={styles.stateTitle}>{message.title}</Text>
        <Text style={styles.stateHint}>{message.hint}</Text>
      </View>
    );
  }
  return <FiguresCard routeCode={route.routeCode} figures={route.figures} />;
}

function FiguresCard({ routeCode, figures: f }: { routeCode: string; figures: SettlementFigures }) {
  const lead = leadOf(f);
  const colors = BLOCK_TONE[lead.tone];
  const updated = f.expectedUpdatedAt ? formatClockTime(f.expectedUpdatedAt) : '';
  const deposited = f.lastDepositAt ? formatClockTime(f.lastDepositAt) : '';
  const checked = f.depositsCheckedAt ? formatClockTime(f.depositsCheckedAt) : '';

  return (
    <View style={styles.group}>
      <ColorBlock tone={lead.tone} style={styles.block}>
        <Text style={[styles.blockTag, { color: colors.fgSub }]}>
          {routeCode.toUpperCase()} · {statusLabel(f.statusGroup).toUpperCase()}
        </Text>
        <Text style={[styles.blockSub, { color: colors.fgSub }]}>{lead.eyebrow}</Text>
        <Text style={[styles.blockAmount, { color: colors.fg }]} accessibilityRole="header">
          {lead.title}
        </Text>
        {f.cashDifference !== null && (
          <Text style={[styles.blockSub, { color: colors.fgSub }]}>
            Depositaste {formatMoney(f.depositedCash)} de {formatMoney(f.expectedCash)} en efectivo
          </Text>
        )}
      </ColorBlock>

      {!f.depositsLive && (
        <Text style={styles.staleNote}>
          {checked
            ? `No pudimos consultar el cajero ahora. Mostramos los depósitos leídos a las ${checked}.`
            : 'No pudimos consultar el cajero ahora. Mostramos los últimos depósitos registrados.'}
        </Text>
      )}

      <View style={styles.card}>
        <Text style={styles.section}>Revisión de tesorería</Text>
        <Text style={styles.review}>{officialReview(f)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Lo que espera Aguas</Text>
        <Row label="Efectivo" value={formatMoney(f.expectedCash)} />
        <Row label="Cheques" value={formatMoney(f.expectedChecks)} />
        <Row label="Retenciones" value={formatMoney(f.expectedWithholdings)} />
        <Row label="Total esperado" value={formatMoney(f.expectedTotal)} strong last />
        {updated ? <Text style={styles.note}>Actualizado a las {updated}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Lo que rendiste</Text>
        <Row label="Efectivo depositado" value={formatMoney(f.depositedCash)} />
        <Row label="Cheques confirmados" value={formatMoney(f.confirmedChecks)} />
        <Row label="Retenciones confirmadas" value={formatMoney(f.confirmedWithholdings)} />
        <Row label="Total recibido" value={formatMoney(f.totalReceived)} strong last />
        <Text style={styles.note}>
          {deposited ? `Último depósito a las ${deposited}` : 'Todavía no hay depósitos registrados.'}
        </Text>
      </View>
    </View>
  );
}

function Row({ label, value, strong, last }: { label: string; value: string; strong?: boolean; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={strong ? styles.rowKStrong : styles.rowK}>{label}</Text>
      <Text style={strong ? styles.rowVStrong : styles.rowV}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  body: { paddingHorizontal: S.gutter, paddingBottom: S.lg, gap: S.md, flexGrow: 1 },
  loading: { alignItems: 'center', paddingVertical: S.xxxl, gap: S.md },
  loadingText: { ...T.body, color: C.ink2 },
  retryWrap: { alignSelf: 'center' },

  group: { gap: S.md },
  block: { gap: S.xs, padding: S.xl },
  blockTag: { ...T.systemTag },
  blockSub: { ...T.label },
  blockAmount: { ...T.display, fontVariant: ['tabular-nums'] },

  card: { borderRadius: R.card, backgroundColor: C.white, paddingHorizontal: S.xl, paddingVertical: S.lg, gap: S.xs },
  routeTag: { ...T.systemTag, color: C.ink2 },
  stateTitle: { ...T.section, color: C.navy },
  stateHint: { ...T.body, color: C.ink2 },
  section: { ...T.label, color: C.ink2, marginBottom: S.xs },
  review: { ...T.data, color: C.navy },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md, minHeight: H.touch },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowK: { ...T.body, color: C.ink2, flexShrink: 1 },
  rowV: { ...T.data, color: C.navy, fontVariant: ['tabular-nums'] },
  rowKStrong: { ...T.label, color: C.navy, flexShrink: 1 },
  rowVStrong: { ...T.data, fontSize: F.lg, color: C.navy, fontVariant: ['tabular-nums'] },
  note: { ...T.secondary, color: C.ink2, marginTop: S.sm },
  staleNote: { ...T.secondary, color: C.orangeText, backgroundColor: C.warningLight, borderRadius: R.md, padding: S.md },
});

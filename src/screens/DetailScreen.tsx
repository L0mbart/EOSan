import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { findClient, statusLabel, toneLabel } from '../clients';
import { Pill, PrimaryButton, ScreenHeader } from '../components';
import { deleteReport, getReport, saveReport } from '../db';
import { formatLongDate } from '../dates';
import { formatMetric, lastFilledSlot, linkIssueCount } from '../metrics';
import { shareReportPdf } from '../share';
import { colors } from '../theme';
import type { Report, Side } from '../types';

export function DetailScreen({
  reportId,
  onBack,
  onEdit,
  onDeleted,
}: {
  reportId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  onDeleted: () => void;
}) {
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getReport(reportId).then(setReport);
  }, [reportId]);

  if (!report) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Laporan" onBack={onBack} />
        <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const current = report;
  const client = findClient(current.clientId);

  async function share(markShared: boolean) {
    setBusy(true);
    try {
      await shareReportPdf({ ...current, shareToWa: markShared || current.shareToWa });
      if (markShared) {
        const next = { ...current, status: 'shared' as const, shareToWa: true };
        await saveReport(next);
        setReport(next);
      }
    } catch {
      Alert.alert('PDF belum terkirim', 'Laporan tetap tersimpan di aplikasi.');
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    Alert.alert('Hapus laporan?', current.code, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          void deleteReport(current.id).then(onDeleted);
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={client.name} subtitle={`${report.code} · ${formatLongDate(report.date)}`} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.row}>
          <Pill label={statusLabel(report.status)} tone={report.status === 'draft' ? 'muted' : 'ok'} />
          <Text style={styles.shift}>
            {report.shiftStart}–{report.shiftEnd} · {report.location}
          </Text>
        </View>
        <Text style={styles.engineer}>{report.engineerName}</Text>

        <Text style={styles.section}>Kegiatan</Text>
        <View style={styles.card}>
          {report.activities.map((activity) => (
            <View key={activity.id} style={styles.activity}>
              <Text style={styles.when}>
                {activity.start}–{activity.end}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.note}>{activity.note}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Traffic</Text>
        {client.links.map((link) => {
          const slot = lastFilledSlot(report, link.id);
          const issues = linkIssueCount(report, link.id);
          return (
            <View key={link.id} style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle}>{link.name}</Text>
                  <Text style={styles.note}>{link.role}</Text>
                </View>
                <Pill label={toneLabel(link.tone)} tone={link.tone} />
              </View>
              {slot ? (
                <Text style={styles.note}>Jendela {client.windows.find((item) => item.id === slot.windowId)?.label}</Text>
              ) : null}
              <TrafficLine label="Download" side={slot?.download} />
              <TrafficLine label="Upload" side={slot?.upload} />
              {issues > 0 ? <Text style={styles.warn}>{issues} angka perlu dicek di detail PDF</Text> : null}
            </View>
          );
        })}

        <Text style={styles.section}>Catatan</Text>
        <View style={styles.card}>
          <Text style={styles.note}>{report.notes.trim() || 'Tidak ada catatan.'}</Text>
        </View>
        <View style={styles.deleteWrap}>
          <PrimaryButton label="Hapus laporan" danger onPress={remove} />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label="Ubah" secondary onPress={() => onEdit(report.id)} disabled={busy} />
        <View style={{ width: 8 }} />
        <PrimaryButton label={busy ? 'Menyiapkan…' : 'PDF / WhatsApp'} onPress={() => void share(true)} disabled={busy} />
      </View>
    </View>
  );
}

function TrafficLine({ label, side }: { label: string; side?: Side }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.activityTitle}>{label}</Text>
      <View style={styles.metrics}>
        <View style={{ flex: 1 }}>
          <Text style={styles.note}>Saat ini</Text>
          <Text style={styles.figure}>{side ? formatMetric(side.current) : '—'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.note}>Rata-rata</Text>
          <Text style={styles.figure}>{side ? formatMetric(side.avg) : '—'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.note}>Maks</Text>
          <Text style={styles.figure}>{side ? formatMetric(side.max) : '—'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  body: { padding: 20, paddingBottom: 28, width: '100%', maxWidth: 920, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  shift: { color: colors.muted, flex: 1, textAlign: 'right' },
  engineer: { color: colors.ink, fontSize: 20, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  section: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginTop: 16, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 14, marginBottom: 10 },
  activity: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  when: { width: 92, color: colors.ink, fontWeight: '700' },
  activityTitle: { color: colors.ink, fontWeight: '700' },
  note: { color: colors.muted, marginTop: 2, lineHeight: 18 },
  metrics: { flexDirection: 'row', marginTop: 8, gap: 8 },
  figure: { color: colors.ink, fontSize: 16, fontWeight: '700', marginTop: 2 },
  warn: { color: colors.amber, marginTop: 10, fontWeight: '700' },
  deleteWrap: { flexDirection: 'row', marginTop: 8 },
  footer: { flexDirection: 'row', padding: 16, paddingTop: 0, width: '100%', maxWidth: 920, alignSelf: 'center' },
});

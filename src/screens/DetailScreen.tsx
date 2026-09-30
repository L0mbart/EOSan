import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { findClient, statusLabel, toneLabel } from '../clients';
import { Pill, PrimaryButton, ScreenHeader } from '../components';
import { deleteReport, getReport, saveReport } from '../db';
import { formatLongDate } from '../dates';
import { formatMetric, lastFilledSlot, linkIssueCount } from '../metrics';
import { shareReportPdf } from '../share';
import { colors } from '../theme';
import type { Report } from '../types';

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
              <View style={styles.metrics}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.note}>Download</Text>
                  <Text style={styles.figure}>{slot ? formatMetric(slot.download.current) : '—'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.note}>Upload</Text>
                  <Text style={styles.figure}>{slot ? formatMetric(slot.upload.current) : '—'}</Text>
                </View>
              </View>
              {issues > 0 ? <Text style={styles.warn}>{issues} angka perlu dicek di detail PDF</Text> : null}
            </View>
          );
        })}

        <Text style={styles.section}>Catatan</Text>
        <View style={styles.card}>
          <Text style={styles.note}>{report.notes.trim() || 'Tidak ada catatan.'}</Text>
        </View>
        <Pressable onPress={remove}>
          <Text style={styles.delete}>Hapus laporan</Text>
        </Pressable>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label="Ubah" secondary onPress={() => onEdit(report.id)} disabled={busy} />
        <View style={{ width: 8 }} />
        <PrimaryButton label={busy ? 'Menyiapkan…' : 'PDF / WhatsApp'} onPress={() => void share(true)} disabled={busy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  body: { padding: 16, paddingBottom: 28 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  shift: { color: colors.muted, flex: 1, textAlign: 'right' },
  engineer: { color: colors.ink, fontSize: 18, fontWeight: '700', marginTop: 10, marginBottom: 8 },
  section: { color: colors.teal, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginTop: 14, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10 },
  activity: { flexDirection: 'row', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  when: { width: 92, color: colors.teal, fontWeight: '700' },
  activityTitle: { color: colors.ink, fontWeight: '700' },
  note: { color: colors.muted, marginTop: 2, lineHeight: 18 },
  metrics: { flexDirection: 'row', marginTop: 12 },
  figure: { color: colors.ink, fontSize: 18, fontWeight: '700', marginTop: 2 },
  warn: { color: colors.amber, marginTop: 8, fontWeight: '700' },
  delete: { color: colors.danger, textAlign: 'center', marginTop: 12, fontWeight: '700' },
  footer: { flexDirection: 'row', padding: 16, paddingTop: 0 },
});

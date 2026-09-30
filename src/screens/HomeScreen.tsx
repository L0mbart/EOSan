import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { statusLabel } from '../clients';
import { Pill, PrimaryButton, ScreenHeader } from '../components';
import { formatLongDate } from '../dates';
import { filledWindowCount, reportIssueCount } from '../metrics';
import { colors } from '../theme';
import type { Report } from '../types';

export function HomeScreen({
  reports,
  engineerName,
  onCreate,
  onOpen,
  onSaveName,
}: {
  reports: Report[];
  engineerName: string;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onSaveName: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState(engineerName);

  function create() {
    if (!engineerName.trim()) {
      setDraftName('');
      setOpen(true);
      return;
    }
    onCreate();
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        kicker="PT. JALA LINTAS MEDIA"
        title="EOS"
        subtitle="Bawaslu RI · laporan harian"
        right={engineerName ? engineerName.split(' ')[0] : 'Nama'}
      />
      <ScrollView contentContainerStyle={styles.body}>
        <Pressable
          style={styles.nameRow}
          onPress={() => {
            setDraftName(engineerName);
            setOpen(true);
          }}
        >
          <Text style={styles.nameLabel}>Engineer on site</Text>
          <Text style={styles.nameValue}>{engineerName || 'Ketuk untuk mengisi nama'}</Text>
        </Pressable>

        <Text style={styles.section}>Laporan</Text>
        {reports.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.empty}>Belum ada laporan. Buat laporan untuk shift hari ini.</Text>
          </View>
        ) : (
          reports.map((report) => {
            const issues = reportIssueCount(report);
            return (
              <Pressable key={report.id} style={styles.card} onPress={() => onOpen(report.id)}>
                <View style={styles.cardTop}>
                  <Text style={styles.date}>{formatLongDate(report.date)}</Text>
                  <Pill
                    label={issues > 0 ? 'Perlu dicek' : statusLabel(report.status)}
                    tone={issues > 0 ? 'amber' : report.status === 'draft' ? 'muted' : 'ok'}
                  />
                </View>
                <Text style={styles.code}>{report.code}</Text>
                <Text style={styles.meta}>
                  {report.engineerName || 'Tanpa nama'} · {filledWindowCount(report)} jendela terisi
                  {report.shareToWa ? ' · siap WA' : ''}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label="Buat laporan" onPress={create} />
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nama engineer</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Nama lengkap"
              placeholderTextColor="#9AA7B4"
              style={styles.modalInput}
            />
            <PrimaryButton
              label="Simpan"
              disabled={!draftName.trim()}
              onPress={() => {
                onSaveName(draftName.trim());
                setOpen(false);
                if (!engineerName.trim()) onCreate();
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  body: { padding: 16, paddingBottom: 24 },
  nameRow: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 18 },
  nameLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  nameValue: { color: colors.ink, fontSize: 16, marginTop: 4, fontWeight: '600' },
  section: { color: colors.teal, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  date: { color: colors.ink, fontWeight: '700', fontSize: 15, flex: 1 },
  code: { color: colors.teal, marginTop: 8, fontWeight: '700' },
  meta: { color: colors.muted, marginTop: 4, fontSize: 13 },
  empty: { color: colors.muted, lineHeight: 20 },
  footer: { padding: 16, paddingTop: 0 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16,32,51,0.45)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.paper, borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 12 },
  modalInput: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    color: colors.ink,
  },
});

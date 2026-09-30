import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { findClient, statusLabel } from '../clients';
import { Pill, PrimaryButton, ScreenHeader, TextButton } from '../components';
import { formatLongDate } from '../dates';
import { filledWindowCount, reportIssueCount } from '../metrics';
import { colors } from '../theme';
import type { Report, SessionUser } from '../types';

export function HomeScreen({
  reports,
  engineerName,
  user,
  onCreate,
  onOpen,
  onUsers,
  onLogout,
  onSaveName,
}: {
  reports: Report[];
  engineerName: string;
  user: SessionUser;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onUsers: () => void;
  onLogout: () => void;
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

  const flagged = reports.filter((report) => reportIssueCount(report) > 0).length;
  const drafts = reports.filter((report) => report.status === 'draft').length;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        kicker="Laporan lapangan"
        title="EOS"
        subtitle={user.displayName}
        trailing={
          <View style={styles.trailing}>
            {user.role === 'admin' ? <TextButton label="Pengguna" onPress={onUsers} /> : null}
            <TextButton label="Keluar" onPress={onLogout} />
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{reports.length}</Text>
            <Text style={styles.statLabel}>Laporan</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{drafts}</Text>
            <Text style={styles.statLabel}>Draf</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{flagged}</Text>
            <Text style={styles.statLabel}>Perlu dicek</Text>
          </View>
        </View>

        <Pressable
          style={styles.nameRow}
          onPress={() => {
            setDraftName(engineerName);
            setOpen(true);
          }}
        >
          <View>
            <Text style={styles.nameLabel}>Engineer on site</Text>
            <Text style={styles.nameValue}>{engineerName || 'Ketuk untuk mengisi nama'}</Text>
          </View>
          <Text style={styles.editName}>Ubah</Text>
        </Pressable>

        <Text style={styles.section}>Laporan</Text>
        {reports.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.empty}>Belum ada laporan. Buat laporan untuk shift hari ini.</Text>
          </View>
        ) : (
          reports.map((report) => {
            const issues = reportIssueCount(report);
            const client = findClient(report.clientId);
            return (
              <Pressable key={report.id} style={styles.card} onPress={() => onOpen(report.id)}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.date}>{formatLongDate(report.date)}</Text>
                    <Text style={styles.client}>{client.name}</Text>
                  </View>
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
  trailing: { flexDirection: 'row', alignItems: 'center' },
  body: { padding: 20, paddingBottom: 24, width: '100%', maxWidth: 920, alignSelf: 'center' },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12 },
  statValue: { color: colors.ink, fontSize: 22, fontWeight: '700' },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  nameRow: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  nameValue: { color: colors.ink, fontSize: 16, marginTop: 4, fontWeight: '600' },
  editName: { color: colors.teal, fontWeight: '700' },
  section: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 14, marginBottom: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  date: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  client: { color: colors.muted, marginTop: 2, fontSize: 13 },
  code: { color: colors.ink, marginTop: 10, fontWeight: '700', letterSpacing: 0.2 },
  meta: { color: colors.muted, marginTop: 4, fontSize: 13 },
  empty: { color: colors.muted, lineHeight: 20 },
  footer: { flexDirection: 'row', padding: 16, paddingTop: 0, width: '100%', maxWidth: 920, alignSelf: 'center' },
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

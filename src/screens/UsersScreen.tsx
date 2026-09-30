import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Field, Pill, PrimaryButton, ScreenHeader } from '../components';
import { createUser, listUsers } from '../db';
import { colors } from '../theme';
import type { SessionUser, UserRole } from '../types';

export function UsersScreen({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('engineer');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setUsers(await listUsers());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function submit() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await createUser({ username, displayName, password, role });
      setUsername('');
      setDisplayName('');
      setPassword('');
      setRole('engineer');
      setNotice('Pengguna tersimpan. Berikan nama pengguna dan kata sandi itu kepadanya.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pengguna belum tersimpan.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Pengguna" subtitle="Admin dapat menambah akun untuk engineer." onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.heading}>Akun baru</Text>
          <Field label="Nama pengguna" value={username} onChangeText={setUsername} raw placeholder="misalnya raka.eos" />
          <Field label="Nama tampilan" value={displayName} onChangeText={setDisplayName} placeholder="Nama lengkap" />
          <Field label="Kata sandi" value={password} onChangeText={setPassword} secure placeholder="Minimal 8 karakter" />
          <Text style={styles.label}>Peran</Text>
          <View style={styles.roles}>
            <View style={{ flex: 1 }}>
              <PrimaryButton label="Engineer" secondary={role !== 'engineer'} onPress={() => setRole('engineer')} />
            </View>
            <View style={{ width: 8 }} />
            <View style={{ flex: 1 }}>
              <PrimaryButton label="Admin" secondary={role !== 'admin'} onPress={() => setRole('admin')} />
            </View>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          <View style={styles.action}>
            <PrimaryButton label={busy ? 'Menyimpan…' : 'Buat pengguna'} disabled={busy} onPress={() => void submit()} />
          </View>
        </View>

        <Text style={styles.section}>Yang sudah ada</Text>
        {users.map((user) => (
          <View key={user.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user.displayName}</Text>
              <Text style={styles.meta}>{user.username}</Text>
            </View>
            <Pill label={user.role === 'admin' ? 'Admin' : 'Engineer'} tone={user.role === 'admin' ? 'ok' : 'muted'} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  body: { padding: 20, paddingBottom: 32, width: '100%', maxWidth: 920, alignSelf: 'center' },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 16, marginBottom: 18 },
  heading: { color: colors.ink, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, marginBottom: 8 },
  roles: { flexDirection: 'row', marginBottom: 12 },
  action: { flexDirection: 'row', marginTop: 4 },
  error: { color: colors.danger, marginBottom: 10, lineHeight: 20 },
  notice: { color: colors.green, marginBottom: 10, lineHeight: 20 },
  section: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 },
  row: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  name: { color: colors.ink, fontWeight: '700' },
  meta: { color: colors.muted, marginTop: 2 },
});

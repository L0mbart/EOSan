import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { company } from '../clients';
import { Field, PrimaryButton } from '../components';
import { login } from '../db';
import { colors } from '../theme';
import type { SessionUser } from '../types';

export function LoginScreen({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const user = await login(username, password);
      if (!user) {
        setError('Nama pengguna atau kata sandi tidak sesuai.');
        return;
      }
      onLogin(user);
    } catch {
      setError('Masuk belum berhasil. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <View style={styles.mark}>
          <Text style={styles.markText}>EOS</Text>
        </View>
        <Text style={styles.kicker}>{company.name}</Text>
        <Text style={styles.title}>Masuk</Text>
        <Text style={styles.lead}>Laporan harian engineer on site.</Text>
        <Field label="Nama pengguna" value={username} onChangeText={setUsername} raw placeholder="nama.pengguna" />
        <Field label="Kata sandi" value={password} onChangeText={setPassword} secure placeholder="Kata sandi" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.action}>
          <PrimaryButton
            label={busy ? 'Memeriksa…' : 'Masuk'}
            disabled={busy || !username.trim() || !password}
            onPress={() => void submit()}
          />
        </View>
        <Text style={styles.foot}>Akun disiapkan oleh admin dan tersimpan di perangkat ini.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.white, borderRadius: 12, padding: 24 },
  mark: { alignSelf: 'flex-start', backgroundColor: colors.navy, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 16 },
  markText: { color: colors.white, fontWeight: '700', letterSpacing: 0.8, fontSize: 12 },
  kicker: { color: colors.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  title: { color: colors.ink, fontSize: 32, fontWeight: '700', marginTop: 8, letterSpacing: -0.4 },
  lead: { color: colors.muted, marginTop: 4, marginBottom: 20 },
  error: { color: colors.danger, marginBottom: 12, lineHeight: 20 },
  action: { flexDirection: 'row' },
  foot: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 16 },
});

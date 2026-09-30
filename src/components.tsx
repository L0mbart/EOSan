import type { ReactNode } from 'react';
import { Platform, Pressable, SafeAreaView, StatusBar as RNStatusBar, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from './theme';

export function ScreenHeader({
  kicker,
  title,
  subtitle,
  onBack,
  trailing,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.headerSafe}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
              <Text style={styles.back}>Kembali</Text>
            </Pressable>
          ) : (
            <View style={styles.brand}>
              <View style={styles.mark}>
                <Text style={styles.markText}>EOS</Text>
              </View>
              <Text style={styles.kicker}>{kicker ?? 'Jala Lintas Media'}</Text>
            </View>
          )}
          {trailing}
        </View>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

export function Pill({ label, tone }: { label: string; tone: 'ok' | 'backup' | 'standby' | 'amber' | 'muted' }) {
  return (
    <View style={[styles.pill, styles[tone]]}>
      <Text style={[styles.pillText, styles[`${tone}Text`]]}>{label}</Text>
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboard,
  secure,
  raw,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'decimal-pad' | 'numbers-and-punctuation';
  secure?: boolean;
  raw?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#93A0AE"
        keyboardType={keyboard ?? 'default'}
        secureTextEntry={secure}
        autoCapitalize={secure || raw ? 'none' : 'sentences'}
        autoCorrect={!(secure || raw)}
        style={styles.input}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  secondary,
  danger,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        secondary ? styles.secondary : danger ? styles.dangerButton : styles.primary,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryText, danger && styles.dangerText]}>{label}</Text>
    </Pressable>
  );
}

export function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.textButton}>
      <Text style={styles.textButtonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerSafe: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 0,
  },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, width: '100%', maxWidth: 920, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { backgroundColor: colors.navy, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 },
  markText: { color: colors.white, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  kicker: { color: colors.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  backButton: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  back: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  headerTitle: { color: colors.ink, fontSize: 26, fontWeight: '700', marginTop: 14, letterSpacing: -0.3 },
  headerSub: { color: colors.muted, fontSize: 14, marginTop: 4 },
  pill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  ok: { backgroundColor: colors.greenBg },
  okText: { color: colors.green },
  backup: { backgroundColor: colors.tealSoft },
  backupText: { color: colors.teal },
  standby: { backgroundColor: colors.slate },
  standbyText: { color: colors.blue },
  amber: { backgroundColor: colors.amberBg },
  amberText: { color: colors.amber },
  muted: { backgroundColor: colors.slate },
  mutedText: { color: colors.muted },
  field: { marginBottom: 12 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 16,
  },
  button: { borderRadius: 8, paddingVertical: 14, alignItems: 'center', flex: 1 },
  primary: { backgroundColor: colors.navy },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  dangerButton: { backgroundColor: colors.dangerBg },
  disabled: { opacity: 0.45 },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  secondaryText: { color: colors.ink },
  dangerText: { color: colors.danger },
  textButton: { paddingHorizontal: 8, paddingVertical: 6 },
  textButtonLabel: { color: colors.ink, fontSize: 13, fontWeight: '600' },
});

import { Platform, Pressable, SafeAreaView, StatusBar as RNStatusBar, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from './theme';

export function ScreenHeader({
  kicker,
  title,
  subtitle,
  onBack,
  right,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: string;
}) {
  return (
    <SafeAreaView style={styles.headerSafe}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={8}>
              <Text style={styles.back}>Kembali</Text>
            </Pressable>
          ) : (
            <Text style={styles.kicker}>{kicker}</Text>
          )}
          {right ? <Text style={styles.kicker}>{right}</Text> : null}
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
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'decimal-pad' | 'numbers-and-punctuation';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA7B4"
        keyboardType={keyboard ?? 'default'}
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
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, secondary ? styles.secondary : styles.primary, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerSafe: { backgroundColor: colors.navy, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 0 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 22 },
  kicker: { color: '#9ED9D3', fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  back: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  headerTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', marginTop: 8 },
  headerSub: { color: '#C5D0DA', fontSize: 14, marginTop: 4 },
  pill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: '700' },
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
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.ink,
    fontSize: 16,
  },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', flex: 1 },
  primary: { backgroundColor: colors.teal },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  disabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  secondaryText: { color: colors.ink },
});

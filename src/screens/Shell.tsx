import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { TextButton } from '../components';
import { useI18n, type CopyKey } from '../i18n';
import { colors } from '../theme';
import type { SessionUser } from '../types';

export type Section = 'dashboard' | 'customers' | 'sites' | 'personnel' | 'reports' | 'users';

const ITEMS: { id: Section; label: CopyKey; admin?: boolean }[] = [
  { id: 'dashboard', label: 'navDashboard' },
  { id: 'customers', label: 'navClients' },
  { id: 'sites', label: 'navSites' },
  { id: 'personnel', label: 'navPersonnel' },
  { id: 'reports', label: 'navReports' },
  { id: 'users', label: 'navUsers', admin: true },
];

export function Shell({
  section,
  user,
  onNavigate,
  onLogout,
  children,
}: {
  section: Section;
  user: SessionUser;
  onNavigate: (section: Section) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const { t, locale, setLocale } = useI18n();
  const { width } = useWindowDimensions();
  const wide = width >= 980;
  const items = ITEMS.filter((item) => !item.admin || user.role === 'admin');

  return (
    <View style={[styles.root, wide && styles.rootWide]}>
      <View style={[styles.nav, wide ? styles.navWide : styles.navNarrow]}>
        <View style={styles.brandBlock}>
          <Text style={styles.mark}>EOS</Text>
          {wide ? <Text style={styles.brand}>Jala Lintas Media</Text> : null}
        </View>
        <ScrollView horizontal={!wide} contentContainerStyle={wide ? styles.navList : styles.navRow}>
          {items.map((item) => {
            const on = item.id === section;
            return (
              <Pressable key={item.id} onPress={() => onNavigate(item.id)} style={[styles.item, on && styles.itemOn]}>
                <Text style={[styles.itemText, on && styles.itemTextOn]}>{t(item.label)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {wide ? (
          <View style={styles.account}>
            <View style={styles.langs}>
              <Lang label="EN" on={locale === 'en'} onPress={() => setLocale('en')} />
              <Lang label="ID" on={locale === 'id'} onPress={() => setLocale('id')} />
            </View>
            <Text style={styles.accountName}>{user.displayName}</Text>
            <Text style={styles.accountRole}>{user.role === 'admin' ? t('roleAdmin') : t('roleEngineer')}</Text>
            <TextButton label={t('logout')} onPress={onLogout} />
          </View>
        ) : (
          <View style={styles.langs}>
            <Lang label="EN" on={locale === 'en'} onPress={() => setLocale('en')} />
            <Lang label="ID" on={locale === 'id'} onPress={() => setLocale('id')} />
            <TextButton label={t('logout')} onPress={onLogout} />
          </View>
        )}
      </View>
      <View style={styles.main}>{children}</View>
    </View>
  );
}

function Lang({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.lang, on && styles.langOn]}>
      <Text style={[styles.langText, on && styles.langTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  rootWide: { flexDirection: 'row' },
  nav: { backgroundColor: colors.navy },
  navWide: { width: 232, padding: 16 },
  navNarrow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  mark: { color: colors.white, fontWeight: '700', letterSpacing: 0.8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 },
  brand: { color: '#C5D0DA', fontSize: 12, flex: 1 },
  navList: { gap: 4, paddingBottom: 16 },
  navRow: { gap: 4, alignItems: 'center' },
  item: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9 },
  itemOn: { backgroundColor: 'rgba(255,255,255,0.12)' },
  itemText: { color: '#C5D0DA', fontWeight: '600' },
  itemTextOn: { color: colors.white },
  account: { marginTop: 'auto', paddingTop: 16 },
  langs: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  lang: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  langOn: { backgroundColor: colors.white },
  langText: { color: '#C5D0DA', fontSize: 12, fontWeight: '700' },
  langTextOn: { color: colors.navy },
  accountName: { color: colors.white, fontWeight: '700' },
  accountRole: { color: '#9AABBA', fontSize: 12, marginTop: 2, marginBottom: 4 },
  main: { flex: 1, backgroundColor: colors.paper },
});

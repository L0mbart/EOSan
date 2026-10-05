import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { todayIso } from '../dates';
import { useI18n } from '../i18n';
import { contractPhase } from '../ops';
import { colors } from '../theme';
import type { Registry, Report } from '../types';
import { cardLift } from '../motion';
import { PeriodBoard } from './PeriodBoard';

export function DashboardScreen({
  registry,
  reports,
  onOpen,
  onCreate,
}: {
  registry: Registry;
  reports: Report[];
  onOpen: (id: string) => void;
  onCreate: (contractId: string) => void;
}) {
  const { t, locale, setLocale } = useI18n();
  const today = todayIso();
  const active = registry.contracts.filter((contract) => contractPhase(contract, today) === 'active');
  const ending = active.filter((contract) => {
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    const end = contract.endDate;
    const soon = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, '0')}-${String(limit.getDate()).padStart(2, '0')}`;
    return end <= soon;
  });
  const placed = registry.personnel.filter((person) => {
    const customer = registry.customers.find((item) => item.id === person.customerId);
    return Boolean(customer?.sites.some((site) => site.id === person.siteId));
  });
  const filedIds = new Set(
    reports
      .filter((report) => report.date === today && report.status !== 'draft' && report.personnelId && placed.some((person) => person.id === report.personnelId))
      .map((report) => report.personnelId),
  );
  const filedToday = filedIds.size;
  const filingPercent = placed.length === 0 ? 0 : Math.round((filedToday / placed.length) * 100);

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{t('dashboardKicker')}</Text>
          <Text style={styles.title}>{t('dashboardTitle')}</Text>
        </View>
        <View style={styles.langs}>
          <Lang label="EN" on={locale === 'en'} onPress={() => setLocale('en')} />
          <Lang label="ID" on={locale === 'id'} onPress={() => setLocale('id')} />
        </View>
      </View>
      <Text style={styles.lead}>{t('dashboardLead')}</Text>
      <View style={styles.stats}>
        <Stat value={String(registry.customers.filter((item) => item.status === 'active').length)} label={t('statClients')} />
        <Stat value={String(active.length)} label={t('statContracts')} />
        <Stat value={String(registry.personnel.length)} label={t('statEosTotal')} />
        <Stat value={String(registry.personnel.length - placed.length)} label={t('statEosStandby')} />
        <Stat value={String(placed.length)} label={t('statEosAssigned')} />
        <Stat value={placed.length === 0 ? '—' : `${filedToday}/${placed.length} · ${filingPercent}%`} label={t('statReportsToday')} />
        <Stat value={String(ending.length)} label={t('statEnding')} />
      </View>
      <Text style={styles.section}>{t('periodSection')}</Text>
      <PeriodBoard registry={registry} reports={reports} onOpen={onOpen} onCreate={onCreate} />
    </ScrollView>
  );
}

function Lang({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.lang, on && styles.langOn]}>
      <Text style={[styles.langText, on && styles.langTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={[styles.stat, cardLift]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 40, width: '100%', maxWidth: 1100 },
  kicker: { color: colors.teal, fontWeight: '700', fontSize: 12, letterSpacing: 0.4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  langs: { flexDirection: 'row', gap: 6, marginTop: 8 },
  lang: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  langOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  langText: { color: colors.ink, fontWeight: '700', fontSize: 12 },
  langTextOn: { color: colors.white },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700', marginTop: 4 },
  lead: { color: colors.muted, marginTop: 6, marginBottom: 16, lineHeight: 20, maxWidth: 640 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  stat: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, minWidth: 150, flexGrow: 1 },
  value: { color: colors.ink, fontSize: 24, fontWeight: '700' },
  label: { color: colors.muted, marginTop: 4, lineHeight: 18 },
  section: { color: colors.ink, fontWeight: '700', fontSize: 16, marginBottom: 10 },
});

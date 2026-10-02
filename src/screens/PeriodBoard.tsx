import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatLongDate } from '../dates';
import { useI18n } from '../i18n';
import { contractPhase, coverage, periodBounds, reportsForContract } from '../ops';
import { colors } from '../theme';
import type { Cadence, Registry, Report } from '../types';

const CADENCE: { id: Cadence; label: 'day' | 'week' | 'month' | 'year' }[] = [
  { id: 'day', label: 'day' },
  { id: 'week', label: 'week' },
  { id: 'month', label: 'month' },
  { id: 'year', label: 'year' },
];

export function PeriodBoard({
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
  const { t } = useI18n();
  const [cadence, setCadence] = useState<Cadence>('day');
  const [selected, setSelected] = useState<string | null>(null);
  const period = periodBounds(cadence);
  const rows = registry.contracts
    .map((contract) => {
      const customer = registry.customers.find((item) => item.id === contract.customerId);
      const people = registry.personnel.filter((person) => contract.personnelIds.includes(person.id));
      const inPeriod = reportsForContract(reports, contract).filter((report) => report.date >= period.start && report.date <= period.end);
      return { contract, customer, people, inPeriod, rollup: coverage(contract, reports, period.start, period.end) };
    })
    .filter((row) => row.contract.startDate <= period.end && row.contract.endDate >= period.start);

  const open = rows.find((row) => row.contract.id === selected) ?? null;

  return (
    <View>
      <View style={styles.switch}>
        {CADENCE.map((item) => (
          <Pressable key={item.id} onPress={() => { setCadence(item.id); setSelected(null); }} style={[styles.tab, cadence === item.id && styles.tabOn]}>
            <Text style={[styles.tabText, cadence === item.id && styles.tabTextOn]}>{t(item.label)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.period}>{period.label}</Text>
      {rows.length === 0 ? <Text style={styles.empty}>{t('noContracts')}</Text> : null}
      {rows.map((row) => {
        const phase = contractPhase(row.contract);
        return (
          <Pressable key={row.contract.id} style={styles.card} onPress={() => setSelected(row.contract.id === selected ? null : row.contract.id)}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{row.contract.code}</Text>
                <Text style={styles.title}>{row.customer?.name ?? t('clientRemoved')} · {row.contract.title}</Text>
              </View>
              <Text style={styles.phase}>{phase === 'scheduled' ? t('scheduled') : phase === 'closed' ? t('closed') : t('running')}</Text>
            </View>
            <Text style={styles.meta}>
              {row.contract.startDate} – {row.contract.endDate} · {row.people.map((person) => {
                const site = row.customer?.sites.find((item) => item.id === person.siteId);
                return site ? `${person.name} (${site.name})` : person.name;
              }).join(', ') || t('noPersonnel')}
            </Text>
            <Text style={styles.meta}>
              {t('coverage')} {row.rollup.filed}/{row.rollup.expected} · {row.rollup.percent}% · {row.inPeriod.length} {t('reportsInPeriod')}
            </Text>
          </Pressable>
        );
      })}
      {open ? (
        <View style={styles.detail}>
          <Text style={styles.detailTitle}>{open.contract.code}</Text>
          <Text style={styles.meta}>{open.contract.location}</Text>
          {open.contract.notes ? <Text style={styles.meta}>{open.contract.notes}</Text> : null}
          <Pressable onPress={() => onCreate(open.contract.id)} style={styles.file}>
            <Text style={styles.fileText}>{t('createDaily')}</Text>
          </Pressable>
          <Text style={styles.section}>{t('periodReports')}</Text>
          {open.inPeriod.length === 0 ? <Text style={styles.meta}>{t('noReports')}</Text> : null}
          {open.inPeriod
            .slice()
            .sort((left, right) => right.date.localeCompare(left.date))
            .map((report) => (
              <Pressable key={report.id} onPress={() => onOpen(report.id)} style={styles.reportRow}>
                <Text style={styles.code}>{formatLongDate(report.date)}</Text>
                <Text style={styles.meta}>{report.code} · {report.engineerName}</Text>
              </Pressable>
            ))}
          {open.rollup.missing.length > 0 ? (
            <Text style={styles.missing}>
              {t('missingDays')}: {open.rollup.missing.slice(0, 8).map((day) => formatLongDate(day)).join(', ')}
              {open.rollup.missing.length > 8 ? ` + ${open.rollup.missing.length - 8} ${t('moreDays')}` : ''}
            </Text>
          ) : (
            <Text style={styles.ok}>{t('coverageComplete')}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  switch: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  tab: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.white },
  tabOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  tabText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  tabTextOn: { color: colors.white },
  period: { color: colors.muted, marginBottom: 10 },
  empty: { color: colors.muted },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 14, marginBottom: 8 },
  cardTop: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  code: { color: colors.ink, fontWeight: '700' },
  title: { color: colors.muted, marginTop: 2 },
  phase: { color: colors.teal, fontWeight: '700', fontSize: 12 },
  meta: { color: colors.muted, marginTop: 4, lineHeight: 18 },
  detail: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 14, marginTop: 4 },
  detailTitle: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  file: { alignSelf: 'flex-start', backgroundColor: colors.navy, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  fileText: { color: colors.white, fontWeight: '700' },
  section: { color: colors.muted, fontWeight: '700', fontSize: 12, marginTop: 14, marginBottom: 6 },
  reportRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  missing: { color: colors.amber, marginTop: 10, lineHeight: 18 },
  ok: { color: colors.green, marginTop: 10 },
});

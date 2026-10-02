import { ScrollView, StyleSheet, Text } from 'react-native';

import { colors } from '../theme';
import { useI18n } from '../i18n';
import type { Registry, Report } from '../types';
import { CellText, DataTable, StatusBadge } from './DataTable';

export function ReportsScreen({
  registry,
  reports,
  onOpen,
}: {
  registry: Registry;
  reports: Report[];
  onOpen: (id: string) => void;
  onCreate: (contractId: string) => void;
}) {
  const { t } = useI18n();
  const listed = reports.slice().sort((left, right) => right.date.localeCompare(left.date) || right.updatedAt.localeCompare(left.updatedAt));

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.title}>{t('reportsTitle')}</Text>
      <Text style={styles.lead}>{t('reportsLead')}</Text>
      <DataTable
        empty={t('tableEmpty')}
        columns={[
          { label: t('day'), width: 140 },
          { label: t('colCode'), width: 170 },
          { label: t('fullName'), width: 210 },
          { label: t('company'), width: 230 },
          { label: t('site'), width: 200 },
          { label: t('status'), width: 150 },
        ]}
        rows={listed.map((report) => {
          const contract = registry.contracts.find((item) => item.id === report.contractId);
          const customer = registry.customers.find((item) => item.id === contract?.customerId);
          const person = registry.personnel.find((item) => item.id === report.personnelId);
          const site = customer?.sites.find((item) => item.id === person?.siteId);
          return {
            id: report.id,
            onPress: () => onOpen(report.id),
            cells: [
              <CellText key="date">{report.date}</CellText>,
              <CellText key="code">{report.code}</CellText>,
              <CellText key="name">{report.engineerName}</CellText>,
              <CellText key="company">{customer?.name ?? ''}</CellText>,
              <CellText key="site">{site?.name || report.location}</CellText>,
              <StatusBadge key="status" kind={report.status === 'draft' ? 'draft' : report.status === 'shared' ? 'shared' : 'saved'} />,
            ],
          };
        })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 40, width: '100%' },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  lead: { color: colors.muted, marginTop: 6, marginBottom: 16, lineHeight: 20 },
});

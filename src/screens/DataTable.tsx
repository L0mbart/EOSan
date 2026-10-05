import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { colors } from '../theme';
import { cardLift, useEase } from '../motion';
import type { ContractKind } from '../status';
import { useI18n } from '../i18n';

export function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: { label: string; width: number }[];
  rows: { id: string; cells: ReactNode[]; onPress?: () => void; selected?: boolean }[];
  empty: string;
}) {
  const ease = useEase();
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
  return (
    <ScrollView horizontal style={styles.scroller} contentContainerStyle={styles.scroll}>
      <View style={[styles.table, { width: tableWidth }]}>
        <View style={styles.head}>
          {columns.map((column) => (
            <View key={column.label} style={[styles.headCell, { width: column.width }]}>
              <Text style={styles.headText}>{column.label}</Text>
            </View>
          ))}
        </View>
        {rows.length === 0 ? <Text style={styles.empty}>{empty}</Text> : null}
        {rows.map((row) => {
          const content = columns.map((column, index) => (
            <View key={column.label} style={[styles.cell, { width: column.width }]}>{row.cells[index]}</View>
          ));
          if (!row.onPress) {
            return <View key={row.id} style={[styles.row, ease, row.selected && styles.rowOn]}>{content}</View>;
          }
          return (
            <Pressable key={row.id} onPress={row.onPress} style={[styles.row, ease, row.selected && styles.rowOn]}>
              {content}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function CellText({ children }: { children: string }) {
  return <Text style={styles.text}>{children || '—'}</Text>;
}

export function TableActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const { t } = useI18n();
  return (
    <View style={styles.actions}>
      <Pressable onPress={(event) => hold(event, onEdit)}><Text style={styles.edit}>{t('edit')}</Text></Pressable>
      <Pressable onPress={(event) => hold(event, onDelete)}><Text style={styles.delete}>{t('delete')}</Text></Pressable>
    </View>
  );
}

export function StatusBadge({ kind, days }: { kind: ContractKind | 'saved' | 'draft' | 'shared'; days?: number | null }) {
  const { t } = useI18n();
  const label = kind === 'ending'
    ? t('daysLeft').replace('{n}', String(days ?? 0))
    : kind === 'ended'
      ? t('closed')
      : kind === 'inactive'
        ? t('inactive')
        : kind === 'standby'
          ? t('standby')
          : kind === 'scheduled'
            ? t('scheduled')
            : kind === 'saved'
              ? t('reportSaved')
              : kind === 'draft'
                ? t('reportDraft')
                : kind === 'shared'
                  ? t('reportShared')
                  : t('active');
  const tone = kind === 'active' || kind === 'saved' || kind === 'shared' ? 'green' : kind === 'ending' || kind === 'standby' ? 'amber' : 'muted';
  return (
    <View style={styles.badge}>
      <View style={[styles.dot, tone === 'green' && styles.dotGreen, tone === 'amber' && styles.dotAmber, tone === 'muted' && styles.dotMuted]} />
      <Text style={[styles.badgeText, tone === 'green' && styles.textGreen, tone === 'amber' && styles.textAmber]}>{label}</Text>
    </View>
  );
}

function hold(event: GestureResponderEvent, action: () => void) {
  event.stopPropagation();
  action();
}

export function EngineerLines({
  people,
}: {
  people: { id: string; name: string; phone: string; site?: string; status: 'active' | 'standby' }[];
}) {
  const { t } = useI18n();
  const showSite = people.some((person) => person.site !== undefined);
  if (people.length === 0) return <Text style={styles.empty}>{t('noPersonnel')}</Text>;
  return (
    <ScrollView horizontal style={styles.scroller}>
      <View style={[styles.lines, { width: showSite ? 820 : 620 }]}>
        <View style={styles.lineHead}>
          <Text style={[styles.lineLabel, styles.lineName]}>{t('fullName')}</Text>
          {showSite ? <Text style={[styles.lineLabel, styles.lineSite]}>{t('site')}</Text> : null}
          <Text style={[styles.lineLabel, styles.linePhone]}>{t('phone')}</Text>
          <Text style={[styles.lineLabel, styles.lineStatus]}>{t('status')}</Text>
        </View>
        {people.map((person) => (
          <View key={person.id} style={styles.line}>
            <Text style={[styles.text, styles.lineName]}>{person.name}</Text>
            {showSite ? <Text style={[styles.text, styles.lineSite]}>{person.site || '—'}</Text> : null}
            <Text style={[styles.text, styles.linePhone]}>{person.phone || '—'}</Text>
            <View style={styles.lineStatus}>
              <StatusBadge kind={person.status === 'standby' ? 'standby' : 'active'} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: { width: '100%' },
  scroll: { flexGrow: 1 },
  table: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, overflow: 'hidden', ...cardLift },
  head: { flexDirection: 'row', backgroundColor: colors.slate, borderBottomWidth: 1, borderBottomColor: colors.line },
  headCell: { paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center' },
  headText: { color: colors.muted, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  row: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, alignItems: 'flex-start' },
  rowOn: { backgroundColor: colors.tealSoft },
  cell: { paddingHorizontal: 14, paddingVertical: 14, justifyContent: 'center' },
  empty: { color: colors.muted, padding: 14 },
  text: { color: colors.ink, lineHeight: 20, flexShrink: 1 },
  badge: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, width: '100%' },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotGreen: { backgroundColor: colors.green },
  dotAmber: { backgroundColor: colors.amber },
  dotMuted: { backgroundColor: colors.muted },
  badgeText: { color: colors.muted, fontWeight: '700', lineHeight: 18, flex: 1 },
  textGreen: { color: colors.green },
  textAmber: { color: colors.amber },
  lines: { marginTop: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 8, overflow: 'hidden' },
  lineHead: { flexDirection: 'row', backgroundColor: colors.slate, paddingHorizontal: 10, paddingVertical: 8 },
  line: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
  lineLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  lineName: { width: 220 },
  lineSite: { width: 200 },
  linePhone: { width: 170 },
  lineStatus: { width: 160 },
  actions: { flexDirection: 'row', gap: 12 },
  edit: { color: colors.teal, fontWeight: '700' },
  delete: { color: colors.danger, fontWeight: '700' },
});

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Field, PrimaryButton } from '../components';
import { deletePersonnel, savePersonnel } from '../db';
import { isIsoDate, nid } from '../dates';
import { useI18n } from '../i18n';
import { contractKind } from '../status';
import { colors } from '../theme';
import type { Personnel, PersonnelStatus, Registry } from '../types';
import { CellText, DataTable, StatusBadge, TableActions } from './DataTable';

function blankPerson(registry: Registry): Personnel {
  const customer = registry.customers[0];
  return {
    id: nid(),
    name: '',
    nik: '',
    title: 'Engineer On Site',
    phone: '',
    contractStart: '',
    contractEnd: '',
    assignedFrom: '',
    placementStart: '',
    customerId: customer?.id ?? '',
    siteId: customer?.sites[0]?.id ?? '',
    status: 'active',
  };
}

export function PersonnelScreen({
  registry,
  canManage,
  onChanged,
}: {
  registry: Registry;
  canManage: boolean;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Personnel | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const sites = registry.customers.find((customer) => customer.id === draft?.customerId)?.sites ?? [];

  const pickedPerson = registry.personnel.find((person) => person.id === selected) ?? null;
  const picked = pickedPerson
    ? {
        person: pickedPerson,
        customer: registry.customers.find((item) => item.id === pickedPerson.customerId),
        site: registry.customers.find((item) => item.id === pickedPerson.customerId)?.sites.find((item) => item.id === pickedPerson.siteId),
      }
    : null;

  async function save() {
    if (!draft) return;
    if (!draft.name.trim() || !/^\d{16}$/.test(draft.nik.trim()) || !draft.phone.trim() || !draft.customerId || !draft.siteId) {
      setError(t('fillEngineer'));
      return;
    }
    if (!isIsoDate(draft.contractStart) || !isIsoDate(draft.contractEnd) || draft.contractStart > draft.contractEnd) {
      setError(t('badDates'));
      return;
    }
    if (!isIsoDate(draft.assignedFrom) || !isIsoDate(draft.placementStart) || draft.assignedFrom > draft.placementStart) {
      setError(t('badDates'));
      return;
    }
    setError('');
    await savePersonnel({
      ...draft,
      name: draft.name.trim(),
      nik: draft.nik.trim(),
      phone: draft.phone.trim(),
    });
    setDraft(null);
    onChanged();
  }

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('personnelTitle')}</Text>
          <Text style={styles.lead}>{t('personnelLead')}</Text>
        </View>
        {canManage ? (
          <View style={styles.add}>
            <PrimaryButton label={t('newEngineer')} onPress={() => { setDraft(blankPerson(registry)); setError(''); }} />
          </View>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {draft && canManage ? (
        <View style={styles.card}>
          <Field label={t('fullName')} value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
          <Field label={t('nik')} value={draft.nik} onChangeText={(nik) => setDraft({ ...draft, nik })} keyboard="numbers-and-punctuation" raw />
          <Field label={t('phone')} value={draft.phone} onChangeText={(phone) => setDraft({ ...draft, phone })} keyboard="numbers-and-punctuation" raw />
          <View style={styles.pair}>
            <View style={{ flex: 1 }}>
              <Field label={t('engineerStart')} value={draft.contractStart} onChangeText={(contractStart) => setDraft({ ...draft, contractStart })} placeholder="YYYY-MM-DD" raw />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Field label={t('engineerEnd')} value={draft.contractEnd} onChangeText={(contractEnd) => setDraft({ ...draft, contractEnd })} placeholder="YYYY-MM-DD" raw />
            </View>
          </View>
          <Text style={styles.label}>{t('company')}</Text>
          <View style={styles.row}>
            {registry.customers.map((customer) => (
              <Choice
                key={customer.id}
                label={customer.name}
                on={draft.customerId === customer.id}
                onPress={() => setDraft({ ...draft, customerId: customer.id, siteId: customer.sites[0]?.id ?? '' })}
              />
            ))}
          </View>
          <Text style={styles.label}>{t('site')}</Text>
          {sites.length === 0 ? <Text style={styles.meta}>{t('noSites')}</Text> : null}
          <View style={styles.row}>
            {sites.map((site) => (
              <Choice key={site.id} label={site.name} on={draft.siteId === site.id} onPress={() => setDraft({ ...draft, siteId: site.id })} />
            ))}
          </View>
          <View style={styles.pair}>
            <View style={{ flex: 1 }}>
              <Field label={t('assignedFrom')} value={draft.assignedFrom} onChangeText={(assignedFrom) => setDraft({ ...draft, assignedFrom })} placeholder="YYYY-MM-DD" raw />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Field label={t('placementStart')} value={draft.placementStart} onChangeText={(placementStart) => setDraft({ ...draft, placementStart })} placeholder="YYYY-MM-DD" raw />
            </View>
          </View>
          <View style={styles.row}>
            <Choice label={t('active')} on={draft.status === 'active'} onPress={() => setDraft({ ...draft, status: 'active' satisfies PersonnelStatus })} />
            <Choice label={t('standby')} on={draft.status === 'standby'} onPress={() => setDraft({ ...draft, status: 'standby' })} />
          </View>
          <View style={styles.actions}>
            <PrimaryButton label={t('save')} onPress={() => void save()} />
            <View style={{ width: 8 }} />
            <PrimaryButton label={t('cancel')} secondary onPress={() => setDraft(null)} />
          </View>
        </View>
      ) : null}
      <DataTable
        empty={t('tableEmpty')}
        columns={[
          { label: t('fullName'), width: 200 },
          { label: t('nik'), width: 180 },
          { label: t('phone'), width: 160 },
          { label: t('company'), width: 210 },
          { label: t('site'), width: 190 },
          { label: t('contractEnd'), width: 160 },
          { label: t('status'), width: 220 },
          ...(canManage ? [{ label: t('colActions'), width: 140 }] : []),
        ]}
        rows={registry.personnel.map((person) => {
          const customer = registry.customers.find((item) => item.id === person.customerId);
          const site = customer?.sites.find((item) => item.id === person.siteId);
          const mark = contractKind({ start: person.contractStart, end: person.contractEnd, standby: person.status === 'standby' });
          const cells = [
            <CellText key="name">{person.name}</CellText>,
            <CellText key="nik">{person.nik}</CellText>,
            <CellText key="phone">{person.phone}</CellText>,
            <CellText key="company">{customer?.name ?? t('unassigned')}</CellText>,
            <CellText key="site">{site?.name ?? ''}</CellText>,
            <CellText key="end">{person.contractEnd}</CellText>,
            <StatusBadge key="status" kind={mark.kind} days={mark.days} />,
          ];
          if (canManage) {
            cells.push(
              <TableActions
                key="actions"
                onEdit={() => { setDraft({ ...person }); setError(''); }}
                onDelete={() => void deletePersonnel(person.id).then(onChanged)}
              />,
            );
          }
          return {
            id: person.id,
            selected: selected === person.id,
            onPress: () => setSelected(selected === person.id ? null : person.id),
            cells,
          };
        })}
      />
      {picked ? (
        <View style={styles.detail}>
          <Text style={styles.name}>{picked.person.name}</Text>
          <Text style={styles.meta}>NIK {picked.person.nik || '—'} · {picked.person.phone || '—'}</Text>
          <View style={styles.statusLine}>
            <StatusBadge kind={picked.person.status === 'standby' ? 'standby' : 'active'} />
          </View>
          <Text style={styles.section}>{t('engineerStart')}</Text>
          <Text style={styles.meta}>{picked.person.contractStart || '—'}</Text>
          <Text style={styles.section}>{t('engineerEnd')}</Text>
          <Text style={styles.meta}>{picked.person.contractEnd || '—'}</Text>
          <Text style={styles.section}>{t('placementHeading')}</Text>
          <Text style={styles.meta}>{picked.customer?.name ?? t('unassigned')} · {picked.site?.name || '—'}</Text>
          <Text style={styles.meta}>{t('assignedFrom')}: {picked.person.assignedFrom || '—'}</Text>
          <Text style={styles.meta}>{t('placementStart')}: {picked.person.placementStart || '—'}</Text>
          {canManage ? (
            <View style={styles.actions}>
              <PrimaryButton label={t('edit')} secondary onPress={() => { setDraft({ ...picked.person }); setError(''); }} />
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

function Choice({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, on && styles.choiceOn]}>
      <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 40, width: '100%' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  lead: { color: colors.muted, marginTop: 6, lineHeight: 20 },
  add: { width: 140, flexDirection: 'row' },
  error: { color: colors.danger, marginBottom: 10, lineHeight: 20 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 14, marginBottom: 10 },
  detail: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 16, marginTop: 12 },
  section: { color: colors.ink, fontWeight: '700', marginTop: 14 },
  statusLine: { marginTop: 10, alignSelf: 'flex-start' },
  name: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.muted, marginTop: 4, lineHeight: 18 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pair: { flexDirection: 'row' },
  choice: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  choiceOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  choiceText: { color: colors.ink, fontWeight: '700' },
  choiceTextOn: { color: colors.white },
  actions: { flexDirection: 'row', marginTop: 8 },
});

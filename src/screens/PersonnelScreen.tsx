import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Field, PrimaryButton, Select } from '../components';
import { deletePersonnel, savePersonnel } from '../db';
import { isIsoDate, nid } from '../dates';
import { useI18n } from '../i18n';
import { contractKind } from '../status';
import { colors } from '../theme';
import { FadeIn, cardLift } from '../motion';
import type { Personnel, Registry } from '../types';
import { CellText, DataTable, StatusBadge, TableActions } from './DataTable';

function blankPerson(): Personnel {
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
    customerId: '',
    siteId: '',
    placements: [],
    status: 'standby',
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
  const chosenClient = registry.customers.find((customer) => customer.id === draft?.customerId) ?? null;
  const placedOnClient = registry.personnel.filter((person) => person.customerId === draft?.customerId).length;

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
    if (!draft.name.trim() || !/^\d{16}$/.test(draft.nik.trim()) || !draft.phone.trim()) {
      setError(t('fillEngineer'));
      return;
    }
    if (!isIsoDate(draft.contractStart) || !isIsoDate(draft.contractEnd) || draft.contractStart > draft.contractEnd) {
      setError(t('badDates'));
      return;
    }
    if (draft.status === 'standby' || !draft.customerId || !draft.siteId) {
      if (draft.status !== 'standby') {
        setError(t('fillEngineer'));
        return;
      }
      setError('');
      await savePersonnel({
        ...draft,
        name: draft.name.trim(),
        nik: draft.nik.trim(),
        phone: draft.phone.trim(),
        customerId: '',
        siteId: '',
        assignedFrom: '',
        placementStart: '',
        status: 'standby',
      });
      setDraft(null);
      onChanged();
      return;
    }
    if (!isIsoDate(draft.assignedFrom) || !isIsoDate(draft.placementStart) || draft.assignedFrom > draft.placementStart) {
      setError(t('badDates'));
      return;
    }
    const client = registry.customers.find((item) => item.id === draft.customerId);
    const placed = registry.personnel.filter((person) => person.customerId === draft.customerId && person.id !== draft.id).length;
    if (client && placed >= client.eosCount) {
      setError(t('eosLimit').replace('{n}', String(client.eosCount)));
      return;
    }
    setError('');
    await savePersonnel({
      ...draft,
      name: draft.name.trim(),
      nik: draft.nik.trim(),
      phone: draft.phone.trim(),
      status: 'active',
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
            <PrimaryButton label={t('newEngineer')} onPress={() => { setDraft(blankPerson()); setError(''); }} />
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
          <Select
            label={t('status')}
            value={draft.status === 'standby' ? 'standby' : 'assigned'}
            options={[
              { id: 'standby', label: t('standbyOption') },
              { id: 'assigned', label: t('assignedOption') },
            ]}
            onChange={(status) => {
              if (status === 'standby') {
                setDraft({ ...draft, status: 'standby', customerId: '', siteId: '', assignedFrom: '', placementStart: '' });
                return;
              }
              setDraft({ ...draft, status: 'active' });
            }}
          />
          {draft.status === 'active' ? (
            <Select
              label={t('company')}
              value={draft.customerId}
              options={registry.customers.map((customer) => ({ id: customer.id, label: customer.name }))}
              onChange={(customerId) => {
                const customer = registry.customers.find((item) => item.id === customerId);
                setDraft({
                  ...draft,
                  customerId,
                  siteId: customer?.sites[0]?.id ?? '',
                  assignedFrom: customerId === draft.customerId ? draft.assignedFrom : '',
                  placementStart: customerId === draft.customerId ? draft.placementStart : '',
                  status: 'active',
                });
              }}
            />
          ) : null}
          {chosenClient ? <Text style={styles.meta}>{t('eosPlaced').replace('{placed}', String(placedOnClient)).replace('{n}', String(chosenClient.eosCount))}</Text> : null}
          {draft.status === 'active' ? (
            <Select
              label={t('site')}
              value={draft.siteId}
              options={sites.map((site) => ({ id: site.id, label: site.name }))}
              onChange={(siteId) => setDraft({
                ...draft,
                siteId,
                assignedFrom: siteId === draft.siteId ? draft.assignedFrom : '',
                placementStart: siteId === draft.siteId ? draft.placementStart : '',
                status: 'active',
              })}
            />
          ) : null}
          {draft.siteId ? (
            <View style={styles.pair}>
              <View style={{ flex: 1 }}>
                <Field label={t('assignedFrom')} value={draft.assignedFrom} onChangeText={(assignedFrom) => setDraft({ ...draft, assignedFrom })} placeholder="YYYY-MM-DD" raw />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Field label={t('placementStart')} value={draft.placementStart} onChangeText={(placementStart) => setDraft({ ...draft, placementStart })} placeholder="YYYY-MM-DD" raw />
              </View>
            </View>
          ) : null}
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
        <FadeIn id={picked.person.id}>
        <View style={[styles.detail, cardLift]}>
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
          {picked.person.placements.length > 0 ? (
            <View>
              <Text style={styles.section}>{t('placementHistory')}</Text>
              {picked.person.placements.slice().reverse().map((item) => {
                const company = registry.customers.find((customer) => customer.id === item.customerId);
                const site = company?.sites.find((entry) => entry.id === item.siteId);
                return (
                  <Text key={item.id} style={styles.meta}>
                    {company?.name ?? t('clientRemoved')} · {site?.name || '—'} · {item.assignedFrom || '—'} – {item.endedOn || '—'} · {t('placementStart')} {item.placementStart || '—'}
                  </Text>
                );
              })}
            </View>
          ) : null}
          {canManage ? (
            <View style={styles.actions}>
              <PrimaryButton label={t('edit')} secondary onPress={() => { setDraft({ ...picked.person }); setError(''); }} />
            </View>
          ) : null}
        </View>
        </FadeIn>
      ) : null}
    </ScrollView>
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
  pair: { flexDirection: 'row' },
  actions: { flexDirection: 'row', marginTop: 8 },
});

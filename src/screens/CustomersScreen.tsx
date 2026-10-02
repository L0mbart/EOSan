import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Field, PrimaryButton } from '../components';
import { deleteCustomer, saveCustomer } from '../db';
import { isIsoDate, nid } from '../dates';
import { useI18n } from '../i18n';
import { contractKind } from '../status';
import { colors } from '../theme';
import type { Customer, CustomerStatus, Registry, Site } from '../types';
import { CellText, DataTable, EngineerLines, StatusBadge } from './DataTable';

function blankSite(): Site {
  return { id: nid(), name: '', address: '' };
}

function blankCustomer(): Customer {
  return {
    id: nid(),
    name: '',
    picName: '',
    address: '',
    sites: [blankSite()],
    eosCount: 1,
    contractStart: '',
    contractEnd: '',
    codePrefix: 'EOS',
    templateId: 'general',
    status: 'active',
  };
}

export function CustomersScreen({
  registry,
  canManage,
  onChanged,
}: {
  registry: Registry;
  canManage: boolean;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Customer | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [eosText, setEosText] = useState('1');
  const [error, setError] = useState('');

  function open(customer: Customer) {
    setDraft({ ...customer, sites: customer.sites.map((site) => ({ ...site })) });
    setEosText(String(customer.eosCount));
    setError('');
  }

  function updateSite(id: string, patch: Partial<Site>) {
    if (!draft) return;
    setDraft({ ...draft, sites: draft.sites.map((site) => (site.id === id ? { ...site, ...patch } : site)) });
  }

  async function save() {
    if (!draft) return;
    const eosCount = Number(eosText);
    const namedSites = draft.sites.filter((site) => site.name.trim());
    if (!draft.name.trim() || !draft.picName.trim() || !draft.address.trim() || namedSites.length === 0 || !draft.contractStart || !draft.contractEnd) {
      setError(t('fillClient'));
      return;
    }
    if (!isIsoDate(draft.contractStart) || !isIsoDate(draft.contractEnd) || draft.contractStart > draft.contractEnd) {
      setError(t('badDates'));
      return;
    }
    if (!Number.isInteger(eosCount) || eosCount < 0) {
      setError(t('badEosCount'));
      return;
    }
    setError('');
    await saveCustomer({
      ...draft,
      name: draft.name.trim(),
      picName: draft.picName.trim(),
      address: draft.address.trim(),
      sites: namedSites.map((site) => ({ ...site, name: site.name.trim(), address: site.address.trim() })),
      eosCount,
      codePrefix: draft.codePrefix.trim().toUpperCase() || 'EOS',
    });
    setDraft(null);
    onChanged();
  }

  const selectedCustomer = registry.customers.find((customer) => customer.id === selected) ?? null;
  const selectedPeople = registry.personnel.filter((person) => person.customerId === selected);

  async function remove(id: string) {
    setError('');
    try {
      await deleteCustomer(id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error && err.message === 'assigned' ? t('clientHasEngineers') : t('clientHasEngineers'));
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('clientsTitle')}</Text>
          <Text style={styles.lead}>{t('clientsLead')}</Text>
        </View>
        {canManage ? (
          <View style={styles.add}>
            <PrimaryButton label={t('newClient')} onPress={() => open(blankCustomer())} />
          </View>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {draft && canManage ? (
        <View style={styles.card}>
          <Field label={t('companyName')} value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
          <Field label={t('picName')} value={draft.picName} onChangeText={(picName) => setDraft({ ...draft, picName })} />
          <Field label={t('companyAddress')} value={draft.address} onChangeText={(address) => setDraft({ ...draft, address })} />
          <View style={styles.pair}>
            <View style={{ flex: 1 }}>
              <Field label={t('contractStart')} value={draft.contractStart} onChangeText={(contractStart) => setDraft({ ...draft, contractStart })} placeholder="YYYY-MM-DD" raw />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Field label={t('contractEnd')} value={draft.contractEnd} onChangeText={(contractEnd) => setDraft({ ...draft, contractEnd })} placeholder="YYYY-MM-DD" raw />
            </View>
          </View>
          <Field label={t('eosCount')} value={eosText} onChangeText={setEosText} keyboard="numbers-and-punctuation" raw />
          <Text style={styles.label}>{t('sites')}</Text>
          {draft.sites.map((site) => (
            <View key={site.id} style={styles.site}>
              <Field label={t('siteName')} value={site.name} onChangeText={(name) => updateSite(site.id, { name })} />
              <Field label={t('siteAddress')} value={site.address} onChangeText={(address) => updateSite(site.id, { address })} />
              {draft.sites.length > 1 ? (
                <Pressable onPress={() => setDraft({ ...draft, sites: draft.sites.filter((item) => item.id !== site.id) })}>
                  <Text style={styles.remove}>{t('removeSite')}</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          <Pressable onPress={() => setDraft({ ...draft, sites: [...draft.sites, blankSite()] })}>
            <Text style={styles.addSite}>{t('addSite')}</Text>
          </Pressable>
          <Text style={styles.label}>{t('template')}</Text>
          <View style={styles.row}>
            <Choice label={t('networkTemplate')} on={draft.templateId === 'bawaslu'} onPress={() => setDraft({ ...draft, templateId: 'bawaslu' })} />
            <Choice label={t('generalTemplate')} on={draft.templateId === 'general'} onPress={() => setDraft({ ...draft, templateId: 'general' })} />
          </View>
          <Text style={styles.label}>{t('status')}</Text>
          <View style={styles.row}>
            <Choice label={t('active')} on={draft.status === 'active'} onPress={() => setDraft({ ...draft, status: 'active' satisfies CustomerStatus })} />
            <Choice label={t('inactive')} on={draft.status === 'inactive'} onPress={() => setDraft({ ...draft, status: 'inactive' })} />
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
          { label: t('companyName'), width: 240 },
          { label: t('picName'), width: 210 },
          { label: t('sites'), width: 90 },
          { label: t('eosCount'), width: 130 },
          { label: t('contractEnd'), width: 160 },
          { label: t('status'), width: 220 },
        ]}
        rows={registry.customers.map((customer) => {
          const mark = contractKind({ start: customer.contractStart, end: customer.contractEnd, inactive: customer.status === 'inactive' });
          return {
            id: customer.id,
            selected: selected === customer.id,
            onPress: () => setSelected(customer.id === selected ? null : customer.id),
            cells: [
              <CellText key="name">{customer.name}</CellText>,
              <CellText key="pic">{customer.picName}</CellText>,
              <CellText key="sites">{String(customer.sites.length)}</CellText>,
              <CellText key="eos">{String(customer.eosCount)}</CellText>,
              <CellText key="end">{customer.contractEnd}</CellText>,
              <StatusBadge key="status" kind={mark.kind} days={mark.days} />,
            ],
          };
        })}
      />
      {selectedCustomer ? (
        <View style={styles.detail}>
          <Text style={styles.name}>{selectedCustomer.name}</Text>
          <Text style={styles.meta}>{t('site')}: {selectedCustomer.sites.length}</Text>
          <Text style={styles.meta}>{t('eosCount')}: {selectedCustomer.eosCount}</Text>
          <Text style={styles.personnelLabel}>{t('detailPersonnel')}</Text>
          <EngineerLines
            people={selectedPeople.map((person) => ({
              id: person.id,
              name: person.name,
              phone: person.phone,
              site: selectedCustomer.sites.find((site) => site.id === person.siteId)?.name ?? '',
              status: person.status,
            }))}
          />
          {canManage ? (
            <View style={styles.actions}>
              <PrimaryButton label={t('edit')} secondary onPress={() => open(selectedCustomer)} />
              <View style={{ width: 8 }} />
              <PrimaryButton label={t('delete')} danger onPress={() => void remove(selectedCustomer.id)} />
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
  detail: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 16, marginTop: 12 },
  personnelLabel: { color: colors.ink, fontWeight: '700', marginTop: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  lead: { color: colors.muted, marginTop: 6, lineHeight: 20 },
  add: { width: 140, flexDirection: 'row' },
  error: { color: colors.danger, marginBottom: 10, lineHeight: 20 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 14, marginBottom: 10 },
  name: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.muted, marginTop: 4, lineHeight: 18 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, marginBottom: 8, marginTop: 4 },
  site: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10, marginBottom: 8 },
  remove: { color: colors.danger, fontWeight: '700', marginBottom: 4 },
  addSite: { color: colors.teal, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  pair: { flexDirection: 'row' },
  choice: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  choiceOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  choiceText: { color: colors.ink, fontWeight: '700' },
  choiceTextOn: { color: colors.white },
  actions: { flexDirection: 'row', marginTop: 8 },
});

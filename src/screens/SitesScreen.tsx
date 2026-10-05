import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Field, PrimaryButton, Select } from '../components';
import { saveCustomer, savePersonnel } from '../db';
import { nid } from '../dates';
import { useI18n } from '../i18n';
import { contractKind } from '../status';
import { colors } from '../theme';
import { FadeIn, cardLift } from '../motion';
import type { Registry, Site } from '../types';
import { CellText, DataTable, EngineerLines, StatusBadge, TableActions } from './DataTable';

type Draft = {
  customerId: string;
  originCustomerId: string;
  site: Site;
};

export function SitesScreen({
  registry,
  canManage,
  onChanged,
}: {
  registry: Registry;
  canManage: boolean;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');

  function openNew() {
    const customer = registry.customers[0];
    if (!customer) {
      setError(t('noClientsForSite'));
      return;
    }
    setDraft({ customerId: customer.id, originCustomerId: customer.id, site: { id: nid(), name: '', address: '' } });
    setError('');
  }

  function openExisting(customerId: string, site: Site) {
    setDraft({ customerId, originCustomerId: customerId, site: { ...site } });
    setError('');
  }

  async function save() {
    if (!draft) return;
    const customer = registry.customers.find((item) => item.id === draft.customerId);
    if (!customer || !draft.site.name.trim()) {
      setError(t('fillSite'));
      return;
    }
    const site = { ...draft.site, name: draft.site.name.trim(), address: draft.site.address.trim() };
    const moving = draft.originCustomerId !== customer.id;
    const origin = registry.customers.find((item) => item.id === draft.originCustomerId);
    if (moving && origin && origin.sites.some((item) => item.id === site.id) && origin.sites.length <= 1) {
      setError(t('lastSite'));
      return;
    }
    const sites = customer.sites.some((item) => item.id === site.id)
      ? customer.sites.map((item) => (item.id === site.id ? site : item))
      : [...customer.sites, site];
    setError('');
    await saveCustomer({ ...customer, sites });
    if (moving && origin) {
      await saveCustomer({ ...origin, sites: origin.sites.filter((item) => item.id !== site.id) });
      for (const person of registry.personnel.filter((item) => item.siteId === site.id)) {
        await savePersonnel({ ...person, customerId: customer.id });
      }
    }
    setDraft(null);
    onChanged();
  }

  async function remove(customerId: string, siteId: string) {
    const customer = registry.customers.find((item) => item.id === customerId);
    if (!customer) return;
    if (customer.sites.length <= 1) {
      setError(t('lastSite'));
      return;
    }
    if (registry.personnel.some((person) => person.siteId === siteId)) {
      setError(t('siteHasEngineers'));
      return;
    }
    setError('');
    await saveCustomer({ ...customer, sites: customer.sites.filter((site) => site.id !== siteId) });
    onChanged();
  }

  const rows = registry.customers.flatMap((customer) =>
    customer.sites.map((site) => ({ customer, site, placed: registry.personnel.filter((person) => person.siteId === site.id).length })),
  );
  const selectedSite = rows.find((row) => row.site.id === selected) ?? null;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('sitesTitle')}</Text>
          <Text style={styles.lead}>{t('sitesLead')}</Text>
        </View>
        {canManage ? (
          <View style={styles.add}>
            <PrimaryButton label={t('newSite')} onPress={openNew} />
          </View>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {draft && canManage ? (
        <View style={styles.card}>
          <Select
            label={t('company')}
            value={draft.customerId}
            options={registry.customers.map((customer) => ({ id: customer.id, label: customer.name }))}
            onChange={(customerId) => setDraft({ ...draft, customerId })}
          />
          <Field label={t('siteName')} value={draft.site.name} onChangeText={(name) => setDraft({ ...draft, site: { ...draft.site, name } })} />
          <Field label={t('siteAddress')} value={draft.site.address} onChangeText={(address) => setDraft({ ...draft, site: { ...draft.site, address } })} />
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
          { label: t('siteName'), width: 230 },
          { label: t('company'), width: 220 },
          { label: t('siteAddress'), width: 280 },
          { label: t('eosCount'), width: 120 },
          { label: t('status'), width: 220 },
          ...(canManage ? [{ label: t('colActions'), width: 140 }] : []),
        ]}
        rows={rows.map(({ customer, site, placed }) => {
          const mark = contractKind({ start: customer.contractStart, end: customer.contractEnd, inactive: customer.status === 'inactive' });
          const cells = [
            <CellText key="site">{site.name}</CellText>,
            <CellText key="company">{customer.name}</CellText>,
            <CellText key="address">{site.address}</CellText>,
            <CellText key="eos">{String(placed)}</CellText>,
            <StatusBadge key="status" kind={mark.kind} days={mark.days} />,
          ];
          if (canManage) {
            cells.push(<TableActions key="actions" onEdit={() => openExisting(customer.id, site)} onDelete={() => void remove(customer.id, site.id)} />);
          }
          return {
            id: site.id,
            selected: selected === site.id,
            onPress: () => setSelected(selected === site.id ? null : site.id),
            cells,
          };
        })}
      />
      {selectedSite ? (
        <FadeIn id={selectedSite.site.id}>
        <View style={[styles.detail, cardLift]}>
          <Text style={styles.name}>{selectedSite.site.name}</Text>
          <Text style={styles.meta}>{selectedSite.customer.name}</Text>
          <EngineerLines
            people={registry.personnel
              .filter((person) => person.siteId === selectedSite.site.id)
              .map((person) => ({ id: person.id, name: person.name, phone: person.phone, status: person.status }))}
          />
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
  name: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.muted, marginTop: 4, lineHeight: 18 },
  detail: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 16, marginTop: 12 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, marginBottom: 8, marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 8 },
});

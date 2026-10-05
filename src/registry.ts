import { bawaslu } from './clients';
import { nid } from './dates';
import type { Contract, Customer, Personnel, PlacementRecord, Registry, Site } from './types';

export const seededSite: Site = {
  id: 'site-pusdatin',
  name: 'Gedung C, Site Pusdatin',
  address: bawaslu.location,
};

export const seededCustomer: Customer = {
  id: bawaslu.id,
  name: bawaslu.name,
  picName: '',
  address: bawaslu.location,
  sites: [{ ...seededSite }],
  eosCount: 1,
  contractStart: '2026-01-01',
  contractEnd: '2026-12-31',
  codePrefix: bawaslu.codePrefix,
  templateId: bawaslu.id,
  status: 'active',
};

export const seededPersonnel: Personnel = {
  id: 'personnel-rakan',
  name: 'Muhammad Rakan Ramadhanis',
  nik: '',
  title: 'Engineer On Site',
  phone: '',
  contractStart: '2026-01-01',
  contractEnd: '2026-12-31',
  assignedFrom: '2026-01-01',
  placementStart: '2026-01-01',
  customerId: bawaslu.id,
  siteId: seededSite.id,
  placements: [],
  status: 'active',
};

type LooseCustomer = Partial<Customer> & { site?: string; location?: string };
type LoosePerson = Partial<Personnel>;

function asSites(customer: LooseCustomer): Site[] {
  if (Array.isArray(customer.sites) && customer.sites.length > 0) {
    return customer.sites.map((site) => ({
      id: site.id || nid(),
      name: site.name || customer.site || customer.location || 'Site',
      address: site.address || customer.location || '',
    }));
  }
  return [{
    id: `${customer.id || 'site'}-site`,
    name: customer.site || customer.location || 'Site',
    address: customer.location || '',
  }];
}

export function normalizeCustomer(input: LooseCustomer): Customer {
  return {
    id: input.id || nid(),
    name: input.name || '',
    picName: input.picName || '',
    address: input.address || input.location || '',
    sites: asSites(input),
    eosCount: Number.isFinite(input.eosCount) ? Number(input.eosCount) : 1,
    contractStart: input.contractStart || '2026-01-01',
    contractEnd: input.contractEnd || '2026-12-31',
    codePrefix: input.codePrefix || 'EOS',
    templateId: input.templateId || 'general',
    status: input.status === 'inactive' ? 'inactive' : 'active',
  };
}

export function normalizePerson(input: LoosePerson, customers: Customer[], contracts: Contract[]): Personnel {
  const contract = contracts.find((item) => input.id && item.personnelIds.includes(input.id));
  const customerId = input.customerId !== undefined && input.customerId !== null
    ? input.customerId
    : contract?.customerId || '';
  const customer = customers.find((item) => item.id === customerId);
  const siteId = customerId ? (input.siteId || customer?.sites[0]?.id || '') : '';
  return {
    id: input.id || nid(),
    name: input.name || '',
    nik: input.nik || '',
    title: input.title || 'Engineer On Site',
    phone: input.phone || '',
    contractStart: input.contractStart || customer?.contractStart || '',
    contractEnd: input.contractEnd || customer?.contractEnd || '',
    assignedFrom: siteId ? (input.assignedFrom || '') : '',
    placementStart: siteId ? (input.placementStart || '') : '',
    customerId,
    siteId,
    placements: asPlacements(input.placements),
    status: siteId ? 'active' : 'standby',
  };
}

export function recordTransfer(previous: Personnel | undefined, next: Personnel, endedOn: string): Personnel {
  const placements = previous?.placements ?? [];
  if (!previous?.siteId || (previous.siteId === next.siteId && previous.customerId === next.customerId)) {
    return { ...next, placements };
  }
  return {
    ...next,
    placements: [
      ...placements,
      {
        id: nid(),
        customerId: previous.customerId,
        siteId: previous.siteId,
        assignedFrom: previous.assignedFrom,
        placementStart: previous.placementStart,
        endedOn,
      },
    ],
  };
}

function asPlacements(input: PlacementRecord[] | undefined): PlacementRecord[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((item) => {
    if (!item?.siteId) return [];
    return [{
      id: item.id || nid(),
      customerId: item.customerId || '',
      siteId: item.siteId,
      assignedFrom: item.assignedFrom || '',
      placementStart: item.placementStart || '',
      endedOn: item.endedOn || '',
    }];
  });
}

export function contractsFrom(customers: Customer[], personnel: Personnel[], previous: Contract[] = []): Contract[] {
  return customers.map((customer) => {
    const existing = previous.find((item) => item.customerId === customer.id);
    const id = existing?.id ?? (customer.id === bawaslu.id ? 'contract-bawaslu-2026' : `contract-${customer.id}`);
    return {
      id,
      code: customer.codePrefix || customer.name,
      customerId: customer.id,
      title: customer.sites.map((site) => site.name).join(', ') || customer.name,
      startDate: customer.contractStart,
      endDate: customer.contractEnd,
      location: customer.sites[0]?.address || customer.address,
      personnelIds: personnel.filter((person) => person.customerId === customer.id).map((person) => person.id),
      notes: customer.picName,
    };
  });
}

export function hydrateRegistry(raw: Partial<Registry> | undefined): Registry {
  const previous = raw?.contracts ?? [];
  const customers = (raw?.customers ?? []).map((customer) => normalizeCustomer(customer));
  const personnel = (raw?.personnel ?? []).map((person) => normalizePerson(person, customers, previous));
  return { customers, personnel, contracts: contractsFrom(customers, personnel, previous) };
}

export function defaultRegistry(): Registry {
  const customers = [{ ...seededCustomer, sites: [{ ...seededSite }] }];
  const personnel = [{ ...seededPersonnel }];
  return { customers, personnel, contracts: contractsFrom(customers, personnel) };
}

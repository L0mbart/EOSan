export type Unit = 'Mbps' | 'Kbps';

export type Metric = {
  value: string;
  unit: Unit;
};

export type Side = {
  current: Metric;
  avg: Metric;
  max: Metric;
};

export type SlotImage = {
  base64: string;
  mime: string;
};

export type TrafficSlot = {
  windowId: string;
  download: Side;
  upload: Side;
  image?: SlotImage;
};

export type Activity = {
  id: string;
  start: string;
  end: string;
  title: string;
  note: string;
};

export type Photo = {
  linkId: string;
  windowId: string;
  base64: string;
  mime: string;
};

export type ReportStatus = 'draft' | 'saved' | 'shared';

export type Cadence = 'day' | 'week' | 'month' | 'year';

export type UserRole = 'admin' | 'engineer';

export type Account = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  salt: string;
  passwordHash: string;
};

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
};

export type CustomerStatus = 'active' | 'inactive';

export type Site = {
  id: string;
  name: string;
  address: string;
};

export type Customer = {
  id: string;
  name: string;
  picName: string;
  address: string;
  sites: Site[];
  eosCount: number;
  contractStart: string;
  contractEnd: string;
  codePrefix: string;
  templateId: string;
  status: CustomerStatus;
};

export type PersonnelStatus = 'active' | 'standby';

export type PlacementRecord = {
  id: string;
  customerId: string;
  siteId: string;
  assignedFrom: string;
  placementStart: string;
  endedOn: string;
};

export type Personnel = {
  id: string;
  name: string;
  nik: string;
  title: string;
  phone: string;
  contractStart: string;
  contractEnd: string;
  assignedFrom: string;
  placementStart: string;
  customerId: string;
  siteId: string;
  placements: PlacementRecord[];
  status: PersonnelStatus;
};

export type Contract = {
  id: string;
  code: string;
  customerId: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  personnelIds: string[];
  notes: string;
};

export type Registry = {
  customers: Customer[];
  personnel: Personnel[];
  contracts: Contract[];
};

export type Report = {
  id: string;
  code: string;
  clientId: string;
  contractId?: string;
  contractCode?: string;
  personnelId?: string;
  date: string;
  engineerName: string;
  shiftStart: string;
  shiftEnd: string;
  location: string;
  activities: Activity[];
  slots: Record<string, TrafficSlot[]>;
  notes: string;
  photos: Photo[];
  shareToWa: boolean;
  status: ReportStatus;
  updatedAt: string;
};

export type LinkTone = 'ok' | 'backup' | 'standby';

export type LinkDef = {
  id: string;
  name: string;
  role: 'Mainlink' | 'Backuplink';
  tone: LinkTone;
};

export type WindowDef = {
  id: string;
  label: string;
};

export type Client = {
  id: string;
  name: string;
  site: string;
  location: string;
  codePrefix: string;
  links: LinkDef[];
  windows: WindowDef[];
  defaultShift: { start: string; end: string };
  activityTemplate: Omit<Activity, 'id'>[];
};

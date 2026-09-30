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

export type TrafficSlot = {
  windowId: string;
  download: Side;
  upload: Side;
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

export type Report = {
  id: string;
  code: string;
  clientId: string;
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

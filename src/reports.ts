import { findClient } from './clients';
import { codeFor } from './db';
import { nid, todayIso } from './dates';
import { blankSide } from './metrics';
import type { Client, Report } from './types';

export function createBlankReport(client: Client, engineerName: string): Report {
  const date = todayIso();
  const slots: Report['slots'] = {};
  for (const link of client.links) {
    slots[link.id] = client.windows.map((window) => ({
      windowId: window.id,
      download: blankSide(),
      upload: blankSide(),
    }));
  }
  return {
    id: nid(),
    code: codeFor(client.id, date),
    clientId: client.id,
    date,
    engineerName,
    shiftStart: client.defaultShift.start,
    shiftEnd: client.defaultShift.end,
    location: client.location,
    activities: client.activityTemplate.map((activity) => ({ ...activity, id: nid() })),
    slots,
    notes: '',
    photos: [],
    shareToWa: false,
    status: 'draft',
    updatedAt: new Date().toISOString(),
  };
}

export function clientOf(report: Report): Client {
  return findClient(report.clientId);
}

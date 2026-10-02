import { bawaslu } from './clients';
import { nid } from './dates';
import type { Report, Side, Unit } from './types';

function side(
  current: string,
  currentUnit: Unit,
  avg: string,
  avgUnit: Unit,
  max: string,
  maxUnit: Unit,
): Side {
  return {
    current: { value: current, unit: currentUnit },
    avg: { value: avg, unit: avgUnit },
    max: { value: max, unit: maxUnit },
  };
}

const mb = 'Mbps' as const;
const kb = 'Kbps' as const;

export function sampleBawasluReport(): Report {
  const windows = bawaslu.windows.map((item) => item.id);
  const [w1, w2, w3, w4] = windows;
  return {
    id: 'sample-bawaslu-20260929',
    code: 'EOS-BW-260929',
    clientId: bawaslu.id,
    contractId: 'contract-bawaslu-2026',
    contractCode: 'EOS-BW-2026',
    personnelId: 'personnel-rakan',
    date: '2026-09-29',
    engineerName: 'Muhammad Rakan Ramadhanis',
    shiftStart: '08:00',
    shiftEnd: '17:00',
    location: bawaslu.location,
    status: 'saved',
    shareToWa: false,
    updatedAt: '2026-09-29T17:00:00.000Z',
    notes:
      'Mainlink Gedung A dan Gedung C membawa beban utama. Puncak unduhan Gedung A 170.13 Mbps pada jendela 10:00–14:00. Backuplink metro Gedung C berada di kisaran 1 Kbps dan dicatat sebagai standby.',
    photos: [],
    activities: bawaslu.activityTemplate.map((activity) => ({ ...activity, id: nid() })),
    slots: {
      'inet-a-main': [
        { windowId: w1, download: side('57.53', mb, '55.48', mb, '76.50', mb), upload: side('31.39', mb, '12.18', mb, '42.26', mb) },
        { windowId: w2, download: side('170.13', mb, '65.72', mb, '170.13', mb), upload: side('32.37', mb, '42.51', mb, '131.96', mb) },
        { windowId: w3, download: side('58.05', mb, '73.20', mb, '131.76', mb), upload: side('7.48', mb, '16.35', mb, '35.76', mb) },
        { windowId: w4, download: side('50.93', mb, '56.96', mb, '86.00', mb), upload: side('3.66', mb, '6.25', mb, '14.40', mb) },
      ],
      'inet-a-backup': [
        { windowId: w1, download: side('16.42', mb, '6.63', mb, '16.55', mb), upload: side('712.56', kb, '1.19', mb, '6.46', mb) },
        { windowId: w2, download: side('10.06', mb, '12.76', mb, '26.91', mb), upload: side('678.14', kb, '1.01', mb, '3.64', mb) },
        { windowId: w3, download: side('5.06', mb, '8.57', mb, '19.74', mb), upload: side('621.48', mb, '908.43', mb, '2.76', mb) },
        { windowId: w4, download: side('12.36', mb, '5.85', mb, '20.26', mb), upload: side('621.06', kb, '492.34', kb, '3.42', mb) },
      ],
      'metro-c-main': [
        { windowId: w1, download: side('47.95', mb, '47.93', mb, '64.08', mb), upload: side('29.95', mb, '11.55', mb, '41.18', mb) },
        { windowId: w2, download: side('52.78', mb, '49.22', mb, '65.71', mb), upload: side('29.92', mb, '40.63', mb, '128.31', mb) },
        { windowId: w3, download: side('50.51', mb, '63.51', mb, '125.39', mb), upload: side('6.88', mb, '14.91', mb, '33.75', mb) },
        { windowId: w4, download: side('48.03', mb, '49.91', mb, '53.46', mb), upload: side('3.20', mb, '5.41', mb, '13.67', mb) },
      ],
      'metro-c-backup': [
        { windowId: w1, download: side('1.27', kb, '1.31', kb, '2.53', kb), upload: side('1.36', kb, '1.37', kb, '1.81', kb) },
        { windowId: w2, download: side('1.33', kb, '1.27', kb, '1.33', kb), upload: side('1.40', kb, '1.96', kb, '1.40', kb) },
        { windowId: w3, download: side('1.35', kb, '1.27', kb, '1.35', kb), upload: side('1.41', kb, '1.36', kb, '1.41', kb) },
        { windowId: w4, download: side('1.33', kb, '1.27', kb, '1.35', kb), upload: side('1.39', kb, '1.36', kb, '1.41', kb) },
      ],
    },
  };
}

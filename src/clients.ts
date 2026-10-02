import type { Client, LinkTone, ReportStatus } from './types';

export const company = {
  name: 'PT. Jala Lintas Media',
  address: 'Jl. Raya Mayor Oking Jaya Atmaja No.89, Ciriung, Kec. Cibinong, Kabupaten Bogor, Jawa Barat 16918',
};

export const bawaslu: Client = {
  id: 'bawaslu',
  name: 'Bawaslu RI',
  site: 'Site Pusdatin',
  location: 'Gedung C, Site Pusdatin',
  codePrefix: 'EOS-BW',
  defaultShift: { start: '08:00', end: '17:00' },
  windows: [
    { id: 'w0609', label: '06:00–09:00' },
    { id: 'w1014', label: '10:00–14:00' },
    { id: 'w1618', label: '16:00–18:00' },
    { id: 'w2023', label: '20:00–23:00' },
  ],
  links: [
    { id: 'inet-a-main', name: 'Internet Gedung A', role: 'Mainlink', tone: 'ok' },
    { id: 'inet-a-backup', name: 'Internet Gedung A', role: 'Backuplink', tone: 'backup' },
    { id: 'metro-c-main', name: 'Metro Gedung C', role: 'Mainlink', tone: 'ok' },
    { id: 'metro-c-backup', name: 'Metro Gedung C', role: 'Backuplink', tone: 'standby' },
  ],
  activityTemplate: [
    {
      start: '08:00',
      end: '08:15',
      title: 'Login ke MRTG dan cek traffic internet',
      note: 'Memastikan perangkat aktif dan konektivitas.',
    },
    {
      start: '10:00',
      end: '12:00',
      title: 'Monitoring traffic jaringan guest',
      note: 'Memantau bandwidth dan latency.',
    },
    {
      start: '13:00',
      end: '16:50',
      title: 'Monitoring traffic jaringan guest',
      note: 'Pemantauan lanjutan bandwidth dan latency.',
    },
    {
      start: '16:50',
      end: '17:00',
      title: 'Laporan harian',
      note: 'Menyusun dan mengirim log kegiatan.',
    },
  ],
};

export const generalSite: Client = {
  id: 'general',
  name: 'Klien umum',
  site: 'Site',
  location: 'Lokasi site',
  codePrefix: 'EOS',
  defaultShift: { start: '08:00', end: '17:00' },
  windows: [],
  links: [],
  activityTemplate: [
    {
      start: '08:00',
      end: '09:00',
      title: 'Pengecekan site',
      note: 'Kondisi perangkat dan lingkungan kerja.',
    },
    {
      start: '09:00',
      end: '16:00',
      title: 'Kegiatan sesuai kontrak',
      note: 'Pekerjaan yang diminta pelanggan.',
    },
    {
      start: '16:00',
      end: '17:00',
      title: 'Laporan harian',
      note: 'Menyusun log kegiatan.',
    },
  ],
};

export const clients: Client[] = [bawaslu, generalSite];

export function findClient(id: string): Client {
  return clients.find((client) => client.id === id) ?? bawaslu;
}

export function toneLabel(tone: LinkTone): string {
  if (tone === 'ok') return 'Normal';
  if (tone === 'backup') return 'Backup';
  return 'Standby';
}

export function statusLabel(status: ReportStatus): string {
  if (status === 'draft') return 'Draf';
  if (status === 'shared') return 'Dibagikan';
  return 'Tersimpan';
}

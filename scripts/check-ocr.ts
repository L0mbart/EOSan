import { bawaslu } from '../src/clients';
import { parseGraphText } from '../src/ocr';

const cacti = `
CPE - Bawaslu Gedung A - Traffic - Metro Gedung A - C via Mainlink
From 2026/09/30 06:00:00 To 2026/09/30 09:00:00
Inbound Last: 60.43 M Avg: 53.45 M Max: 89.41 M
Outbound Last: 73.87 M Avg: 34.38 M Max: 82.86 M
`;
const graph = parseGraphText(cacti, bawaslu);
if (graph.linkId !== 'metro-c-main') throw new Error(`link ${graph.linkId}`);
if (graph.windowId !== 'w0609') throw new Error(`window ${graph.windowId}`);
if (graph.date !== '2026-09-30') throw new Error(`date ${graph.date}`);
if (!graph.note.includes('Rabu')) throw new Error(graph.note);
if (graph.download?.current?.value !== '60.43' || graph.download.current.unit !== 'Mbps') {
  throw new Error(`download ${JSON.stringify(graph.download)}`);
}
if (graph.upload?.avg?.value !== '34.38' || graph.upload.max?.value !== '82.86') {
  throw new Error(`upload ${JSON.stringify(graph.upload)}`);
}

const caption = `
Traffic Internet Bawaslu Gedung A Backuplink
Pukul 10:00:14:00 WIB
Current Download: 10.06 Mbps
Average Download: 12.76 Mbps
Maximum Download: 26.91 Mbps
Current Upload: 678.14 Kbps
Average Upload: 1.01 Mbps
Maximum Upload: 3.64 Mbps
`;
const text = parseGraphText(caption, bawaslu);
if (text.linkId !== 'inet-a-backup') throw new Error(`backup ${text.linkId}`);
if (text.windowId !== 'w1014') throw new Error(`slot ${text.windowId}`);
if (text.upload?.current?.unit !== 'Kbps' || text.upload.current.value !== '678.14') {
  throw new Error(`kbps ${JSON.stringify(text.upload)}`);
}
if (text.download?.max?.value !== '26.91') throw new Error('max download');

const scaledOcr = `
CPE - Bawaslu Gedung A - Traffic - SFP 28-1 - Vlan 2758 - Internet via Mainlink
From 2026/09/29 06:00:00 To 2026/09/29 09: 00: 00
BH Inbound Last: 57.53 M Avg: 55.48 M Max: 76.50 M Total In: 76.98 GB
HB Outbound Last: 31.39 M Avg: 12.18 M Max: 42.26 M Total Out: 16.91 GB
`;
const real = parseGraphText(scaledOcr, bawaslu);
if (real.linkId !== 'inet-a-main') throw new Error(`real link ${real.linkId}`);
if (real.windowId !== 'w0609') throw new Error(`real window ${real.windowId}`);
if (real.date !== '2026-09-29') throw new Error(`real date ${real.date}`);
if (real.download?.current?.value !== '57.53' || real.download.avg?.value !== '55.48' || real.download.max?.value !== '76.50') {
  throw new Error(`real download ${JSON.stringify(real.download)}`);
}
if (real.upload?.current?.value !== '31.39' || real.upload.avg?.value !== '12.18' || real.upload.max?.value !== '42.26') {
  throw new Error(`real upload ${JSON.stringify(real.upload)}`);
}

console.log('ocr parser ok');

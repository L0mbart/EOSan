import { metricInconsistent } from '../src/metrics';
import { buildReportHtml } from '../src/pdf';
import { sampleBawasluReport } from '../src/seed';
import type { Metric, Unit } from '../src/types';

function metric(value: string, unit: Unit): Metric {
  return { value, unit };
}

const uploadTooHigh = metricInconsistent(metric('908.43', 'Mbps'), metric('2.76', 'Mbps'));
const mixedUnits = metricInconsistent(metric('712.56', 'Kbps'), metric('6.46', 'Mbps'));
const backupStandby = metricInconsistent(metric('1.96', 'Kbps'), metric('1.40', 'Kbps'));
const normal = metricInconsistent(metric('55.48', 'Mbps'), metric('76.50', 'Mbps'));

if (!uploadTooHigh) throw new Error('908 Mbps average should be flagged');
if (mixedUnits) throw new Error('712 Kbps is below 6.46 Mbps and should pass');
if (!backupStandby) throw new Error('1.96 Kbps average above 1.40 Kbps should be flagged');
if (normal) throw new Error('a normal mainlink row should pass');

const html = buildReportHtml(sampleBawasluReport());
for (const needle of [
  'Laporan Pekerjaan Harian',
  '1. Kegiatan Harian',
  '2. Monitoring Traffic dan Dokumentasi',
  'Bawaslu RI',
  '170.13 Mbps',
  '908.43 Mbps',
  'Muhammad Rakan Ramadhanis',
  'Maximum',
]) {
  if (!html.includes(needle)) throw new Error(`PDF HTML missing ${needle}`);
}
for (const forbidden of ['Kembali', 'Hapus laporan', 'Ubah', 'PDF / WhatsApp']) {
  if (html.includes(forbidden)) throw new Error(`PDF HTML should not include ${forbidden}`);
}

const withGraph = sampleBawasluReport();
const slot = withGraph.slots['inet-a-main']?.[0];
if (!slot) throw new Error('sample slot missing');
slot.image = { base64: 'QUJD', mime: 'image/jpeg' };
const withImage = buildReportHtml(withGraph);
if (!withImage.includes('src="data:image/jpeg;base64,QUJD"')) throw new Error('uploaded graph missing from its slot');
if (!withImage.includes('06:00–09:00')) throw new Error('graph slot window missing');

console.log('report checks ok');

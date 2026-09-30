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
for (const needle of ['Bawaslu RI', '170.13 Mbps', '908.43 Mbps', 'Muhammad Rakan Ramadhanis', 'Tersimpan di aplikasi']) {
  if (!html.includes(needle)) throw new Error(`PDF HTML missing ${needle}`);
}

console.log('report checks ok');

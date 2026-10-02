import { company, findClient } from './clients';
import { formatLongDate } from './dates';
import { formatMetric, metricInconsistent, slotHasValue } from './metrics';
import type { Metric, Photo, Report, Side, SlotImage, TrafficSlot } from './types';

function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function metricText(metric: Metric, bad: boolean): string {
  return `<td class="${bad ? 'bad' : ''}">${esc(formatMetric(metric))}</td>`;
}

function sideRow(label: string, side: Side): string {
  const bad = metricInconsistent(side.avg, side.max);
  return `<tr><th>${label}</th>${metricText(side.current, false)}${metricText(side.avg, bad)}${metricText(side.max, false)}</tr>`;
}

function photoFor(report: Report, linkId: string, windowId: string): Photo | undefined {
  return (report.photos ?? []).find((photo) => photo.linkId === linkId && photo.windowId === windowId && photo.base64);
}

function graph(image: SlotImage | undefined): string {
  if (!image?.base64) return '';
  const mime = image.mime.startsWith('image/') ? image.mime : 'image/jpeg';
  return `<img alt="Grafik traffic" src="data:${mime};base64,${image.base64}" />`;
}

export function buildReportHtml(report: Report): string {
  const client = findClient(report.clientId);
  const activities = report.activities
    .map(
      (activity, index) => `<tr>
        <td class="num">${index + 1}</td>
        <td class="when">${esc(activity.start)}–${esc(activity.end)}</td>
        <td>${esc(activity.title)}</td>
        <td class="muted">${esc(activity.note)}</td>
      </tr>`,
    )
    .join('');

  let entry = 0;
  const monitoring = client.windows
    .map((window) => {
      const blocks = client.links
        .map((link) => {
          const slot = (report.slots[link.id] ?? []).find((item) => item.windowId === window.id);
          const photo = slot?.image?.base64 ? slot.image : photoFor(report, link.id, window.id);
          if (!photo?.base64 && (!slot || !slotHasValue(slot))) return '';
          entry += 1;
          return entryBlock(entry, link.name, link.role, window.label, formatLongDate(report.date), slot, photo);
        })
        .join('');
      if (!blocks) return '';
      return `<h3>Pukul ${esc(window.label)} WIB</h3>${blocks}`;
    })
    .join('');

  const notes = report.notes.trim()
    ? esc(report.notes).replaceAll('\n', '<br/>')
    : 'Tidak ada catatan.';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>${esc(report.code)} ${esc(client.name)}</title>
<style>
  @page { size: A4; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #1b2430; }
  body { font-family: "Segoe UI", Calibri, sans-serif; font-size: 11px; line-height: 1.4; }
  .letterhead { display: flex; justify-content: space-between; gap: 16px; align-items: flex-end; border-bottom: 2.5px solid #102033; padding-bottom: 8px; }
  .brand { font-size: 13px; font-weight: 700; letter-spacing: 0.01em; }
  .addr, .muted { color: #5c6b7c; }
  .code { text-align: right; font-weight: 700; letter-spacing: 0.04em; }
  h1 { margin: 16px 0 0; font-size: 18px; font-weight: 700; letter-spacing: 0.01em; }
  .client { margin: 2px 0 12px; font-size: 13px; }
  h2 { margin: 18px 0 8px; font-size: 13px; border-bottom: 1px solid #d7dee6; padding-bottom: 4px; }
  h3 { margin: 14px 0 8px; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; vertical-align: top; padding: 4px 6px; }
  .identity th { width: 78px; color: #5c6b7c; font-weight: 600; padding-left: 0; }
  .identity td { font-weight: 650; }
  .work th { background: #f3f5f8; color: #5c6b7c; font-size: 10px; border-bottom: 1px solid #d7dee6; }
  .work td { border-bottom: 1px solid #e6ebf0; }
  .num { width: 28px; color: #5c6b7c; }
  .when { width: 92px; white-space: nowrap; font-weight: 700; }
  article { border: 1px solid #e1e7ee; border-left: 3px solid #102033; padding: 8px 10px 10px; margin: 0 0 10px; }
  .cap { margin: 0 0 6px; font-weight: 700; }
  .figures { width: auto; }
  .figures th, .figures td { font-size: 10px; padding: 2px 10px 2px 0; }
  .figures th { color: #5c6b7c; font-weight: 600; }
  .bad { color: #8a5a10; font-weight: 700; }
  img { display: block; width: 100%; height: auto; margin-top: 8px; }
  .notes { white-space: normal; }
  .closing { margin-top: 18px; border-top: 1px solid #d7dee6; padding-top: 8px; color: #5c6b7c; font-size: 10px; }
</style></head><body>
  <header class="letterhead">
    <div>
      <div class="brand">${esc(company.name)}</div>
      <div class="addr">${esc(company.address)}</div>
    </div>
    <div class="code">${esc(report.code)}</div>
  </header>
  <h1>Laporan Pekerjaan Harian</h1>
  <p class="client">${esc(client.name)}</p>
  <table class="identity">
    <tr><th>Nama</th><td>${esc(report.engineerName || '—')}</td><th>Jabatan</th><td>Engineer On Site</td></tr>
    <tr><th>Tanggal</th><td>${esc(formatLongDate(report.date))}</td><th>Jam kerja</th><td>${esc(report.shiftStart)}–${esc(report.shiftEnd)} WIB</td></tr>
    <tr><th>Kontrak</th><td>${esc(report.contractCode || '—')}</td><th>Lokasi</th><td>${esc(report.location)}</td></tr>
  </table>
  <h2>1. Kegiatan Harian</h2>
  <table class="work">
    <thead><tr><th>No</th><th>Waktu</th><th>Kegiatan</th><th>Keterangan</th></tr></thead>
    <tbody>${activities}</tbody>
  </table>
  <h2>2. Monitoring Traffic dan Dokumentasi</h2>
  ${monitoring || '<p class="muted">Belum ada traffic yang terisi.</p>'}
  <h2>3. Catatan</h2>
  <p class="notes">${notes}</p>
  <p class="closing">${esc(company.name)} · ${esc(report.engineerName || 'Engineer On Site')} · ${esc(client.site)}</p>
</body></html>`;
}

function entryBlock(
  index: number,
  name: string,
  role: string,
  windowLabel: string,
  dateLabel: string,
  slot: TrafficSlot | undefined,
  photo: SlotImage | undefined,
): string {
  const download = slot?.download;
  const upload = slot?.upload;
  const figures = download && upload
    ? `<table class="figures">
        <thead><tr><th></th><th>Current</th><th>Average</th><th>Maximum</th></tr></thead>
        <tbody>${sideRow('Download', download)}${sideRow('Upload', upload)}</tbody>
      </table>`
    : '';
  return `<article>
    <p class="cap">${index}. Traffic ${esc(name)} ${esc(role)} pukul ${esc(windowLabel)} WIB, ${esc(dateLabel)}</p>
    ${figures}
    ${graph(photo)}
  </article>`;
}

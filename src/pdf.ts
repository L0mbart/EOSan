import { company, findClient, toneLabel } from './clients';
import { formatLongDate } from './dates';
import { formatMetric, issueCount, lastFilledSlot, linkIssueCount, metricInconsistent } from './metrics';
import type { Metric, Report, Side } from './types';

function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function metricCell(metric: Metric, bad: boolean): string {
  return `<td class="${bad ? 'bad' : ''}">${esc(formatMetric(metric))}</td>`;
}

function sideCells(side: Side): string {
  const bad = metricInconsistent(side.avg, side.max);
  return `${metricCell(side.current, false)}${metricCell(side.avg, bad)}${metricCell(side.max, false)}`;
}

function statusCopy(report: Report): string {
  if (report.status === 'shared') return 'Dibagikan ke WhatsApp';
  if (report.status === 'saved') return 'Tersimpan di aplikasi. Grup WA tidak dikirimi.';
  return 'Masih draf';
}

export function buildReportHtml(report: Report): string {
  const client = findClient(report.clientId);
  const activities = report.activities
    .map(
      (activity) => `<tr>
        <td class="when">${esc(activity.start)}–${esc(activity.end)}</td>
        <td><strong>${esc(activity.title)}</strong><div class="muted">${esc(activity.note)}</div></td>
      </tr>`,
    )
    .join('');

  const cards = client.links
    .map((link) => {
      const slot = lastFilledSlot(report, link.id);
      const issues = linkIssueCount(report, link.id);
      const download = slot ? formatMetric(slot.download.current) : '—';
      const upload = slot ? formatMetric(slot.upload.current) : '—';
      const downloadSub = slot ? `avg ${formatMetric(slot.download.avg)} · max ${formatMetric(slot.download.max)}` : 'Belum diisi';
      const uploadSub = slot ? `avg ${formatMetric(slot.upload.avg)} · max ${formatMetric(slot.upload.max)}` : '';
      const flag = issues > 0 ? `<div class="flag">${issues} angka perlu dicek</div>` : '';
      return `<div class="card">
        <div class="card-top">
          <div><strong>${esc(link.name)}</strong><div class="muted">${esc(link.role)}</div></div>
          <span class="pill ${link.tone}">${toneLabel(link.tone)}</span>
        </div>
        <div class="pair"><div><div class="muted">Download</div><div class="big">${esc(download)}</div><div class="muted">${esc(downloadSub)}</div></div>
        <div><div class="muted">Upload</div><div class="big">${esc(upload)}</div><div class="muted">${esc(uploadSub)}</div></div></div>
        ${flag}
      </div>`;
    })
    .join('');

  const tables = client.links
    .map((link) => {
      const rows = (report.slots[link.id] ?? [])
        .map((slot) => {
          const label = client.windows.find((item) => item.id === slot.windowId)?.label ?? slot.windowId;
          const mark = issueCount(slot) > 0 ? ' class="row-bad"' : '';
          return `<tr${mark}><td>${esc(label)}</td>${sideCells(slot.download)}${sideCells(slot.upload)}</tr>`;
        })
        .join('');
      return `<section class="block">
        <h2>${esc(link.name)} <span>${esc(link.role)}</span></h2>
        <table>
          <thead><tr><th>Waktu</th><th>DL saat ini</th><th>DL rata-rata</th><th>DL maks</th><th>UL saat ini</th><th>UL rata-rata</th><th>UL maks</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join('');

  const notes = report.notes.trim()
    ? esc(report.notes).replaceAll('\n', '<br/>')
    : 'Tidak ada catatan.';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 20px 22px 28px; font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #172033; background: #fff; }
  h1 { margin: 4px 0 8px; font-size: 28px; }
  h2 { margin: 0 0 8px; font-size: 14px; }
  h2 span, .muted { color: #5E6D7E; font-weight: 400; }
  .banner { background: #102033; color: #fff; margin: -20px -22px 16px; padding: 22px; }
  .kicker { color: #9ed9d3; letter-spacing: 0.04em; font-size: 11px; font-weight: 700; }
  .sub { color: #c5d0da; margin-top: 4px; }
  .chip { display: inline-block; margin-top: 12px; background: rgba(255,255,255,0.1); border-radius: 20px; padding: 4px 10px; font-size: 12px; }
  .meta { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .meta td { width: 25%; border: 1px solid #E2E8EC; padding: 8px 10px; vertical-align: top; }
  .label { color: #5E6D7E; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { text-align: left; background: #E8EEF2; color: #5E6D7E; padding: 5px 4px; }
  td { padding: 5px 4px; border-bottom: 1px solid #E2E8EC; vertical-align: top; }
  .when { color: #147A74; font-weight: 700; white-space: nowrap; width: 92px; }
  .grid { width: 100%; }
  .card { border: 1px solid #E2E8EC; border-radius: 8px; padding: 10px; margin: 0 0 8px; }
  .card-top, .pair { display: flex; justify-content: space-between; gap: 8px; }
  .big { font-size: 14px; font-weight: 700; margin: 2px 0; }
  .pill { border-radius: 12px; padding: 2px 8px; font-size: 10px; font-weight: 700; height: fit-content; }
  .ok { background: #E5F6ED; color: #0C7A4B; }
  .backup { background: #E6F4F2; color: #147A74; }
  .standby { background: #E8EEF2; color: #1B4F7A; }
  .flag, .bad { color: #9A6208; font-weight: 700; }
  .block { margin-top: 14px; }
  .break { page-break-before: always; padding-top: 8px; }
  .shot { width: 48%; display: inline-block; vertical-align: top; margin: 0 1% 12px; }
  .frame { border: 1px dashed #C5D0DA; border-radius: 8px; min-height: 90px; margin-bottom: 6px; overflow: hidden; }
  img { width: 100%; height: 140px; object-fit: contain; background: #F6F8F7; }
  .ph { color: #5E6D7E; font-size: 12px; padding: 28px 10px; text-align: center; }
  .foot { margin-top: 18px; border-top: 1px solid #E2E8EC; padding-top: 8px; color: #5E6D7E; font-size: 10px; }
  h3 { font-size: 12px; color: #147A74; letter-spacing: 0.04em; }
</style></head><body>
  <div class="banner">
    <div class="kicker">${esc(company.name.toUpperCase())}</div>
    <div class="sub">LAPORAN HARIAN EOS</div>
    <h1>${esc(client.name)}</h1>
    <div class="chip">${esc(report.location)}</div>
    <div class="sub">${esc(formatLongDate(report.date))} · ${esc(report.shiftStart)}–${esc(report.shiftEnd)} WIB · ${esc(report.code)}</div>
  </div>
  <table class="meta"><tr>
    <td><div class="label">ENGINEER</div><strong>${esc(report.engineerName || '—')}</strong><div class="muted">Engineer On Site</div></td>
    <td><div class="label">KLIEN</div><strong>${esc(client.name)}</strong><div class="muted">${esc(client.site)}</div></td>
    <td><div class="label">LOKASI</div><strong>${esc(report.location)}</strong></td>
    <td><div class="label">CAKUPAN</div><strong>${client.links.length} link</strong><div class="muted">${client.windows.length} jendela</div></td>
  </tr></table>
  <h3>KEGIATAN</h3>
  <table>${activities}</table>
  <h3>RINGKASAN TRAFFIC</h3>
  <p class="muted">Angka pada kartu adalah jendela terakhir yang terisi.</p>
  ${cards}
  <div class="break">
    <h3>DETAIL TRAFFIC</h3>
    <p class="muted">Angka berwarna menandai rata-rata yang lebih besar dari maksimum.</p>
    ${tables}
  </div>
  <div class="break">
    <h3>CATATAN LAPANGAN</h3>
    <p>${notes}</p>
    <p><strong>Status:</strong> ${esc(statusCopy(report))}</p>
    <div class="foot">${esc(company.name)} · ${esc(company.address)} · ${esc(report.engineerName)}</div>
  </div>
</body></html>`;
}

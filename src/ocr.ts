import { formatLongDate, isIsoDate } from './dates';
import type { Client, Metric, Side, Unit } from './types';

export type GraphReading = {
  linkId: string | null;
  windowId: string | null;
  date: string | null;
  download: Partial<Side> | null;
  upload: Partial<Side> | null;
  note: string;
};

function metric(value: string, unit: Unit): Metric {
  return { value, unit };
}

function parseNumberUnit(chunk: string): Metric | null {
  const match = chunk.replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(kbps|mbps|[kmg])?/i);
  if (!match) return null;
  const unitToken = (match[2] ?? 'm').toLowerCase();
  if (unitToken.startsWith('g')) {
    return metric(String(Math.round(Number(match[1]) * 1000 * 100) / 100), 'Mbps');
  }
  return metric(match[1], unitToken.startsWith('k') ? 'Kbps' : 'Mbps');
}

function grab(text: string, pattern: RegExp): Metric | null {
  const match = text.match(pattern);
  return match ? parseNumberUnit(match[1]) : null;
}

function sideFrom(current: Metric | null, avg: Metric | null, max: Metric | null): Partial<Side> | null {
  if (!current && !avg && !max) return null;
  const side: Partial<Side> = {};
  if (current) side.current = current;
  if (avg) side.avg = avg;
  if (max) side.max = max;
  return side;
}

function extractExplicit(text: string, word: 'download' | 'upload'): Partial<Side> | null {
  return sideFrom(
    grab(text, new RegExp(`(?:current|saat ini)\\s+${word}\\s*[:\\-]?\\s*([^\\n]+)`, 'i')),
    grab(text, new RegExp(`(?:average|avg|rata-rata|rata rata)\\s+${word}\\s*[:\\-]?\\s*([^\\n]+)`, 'i')),
    grab(text, new RegExp(`(?:maximum|max|maks(?:imum)?)\\s+${word}\\s*[:\\-]?\\s*([^\\n]+)`, 'i')),
  );
}

function extractLegend(text: string, head: RegExp): Partial<Side> | null {
  const start = text.search(head);
  if (start < 0) return null;
  const slice = text.slice(start, start + 240);
  return sideFrom(
    grab(slice, /last\s*[:\-]?\s*([^\n]+)/i),
    grab(slice, /avg(?:erage)?\s*[:\-]?\s*([^\n]+)/i),
    grab(slice, /max(?:imum)?\s*[:\-]?\s*([^\n]+)/i),
  );
}

function clock(value: string): string {
  const [hour, minute] = value.split(':');
  return `${hour.padStart(2, '0')}:${minute}`;
}

function windowEnds(label: string): [string, string] {
  const [start, end] = label.split(/[–—-]/).map((part) => part.trim());
  return [start, end];
}

function matchWindow(text: string, client: Client): string | null {
  const normalized = text.replace(/[–—]/g, '-').replace(/(\d{1,2})\s*:\s*(\d{2})/g, (_, hour: string, minute: string) => `${hour.padStart(2, '0')}:${minute}`);
  const fromTo = normalized.match(/from[\s\S]{0,48}?(\d{1,2}:\d{2})[\s\S]{0,48}?to[\s\S]{0,24}?(\d{1,2}:\d{2})/i);
  const compact = normalized.match(/(?:pukul\s*)?(\d{1,2}:\d{2})\s*[:\-]\s*(\d{1,2}:\d{2})/i);
  const pair = fromTo ?? compact;
  if (pair) {
    const start = clock(pair[1]);
    const end = clock(pair[2]);
    const hit = client.windows.find((window) => {
      const [windowStart, windowEnd] = windowEnds(window.label);
      return windowStart === start && windowEnd === end;
    });
    if (hit) return hit.id;
  }
  for (const window of client.windows) {
    const [start, end] = windowEnds(window.label);
    const startAt = normalized.indexOf(start);
    const endAt = normalized.indexOf(end, startAt + start.length);
    if (startAt >= 0 && endAt > startAt) return window.id;
  }
  return null;
}

function filterIfSome<T>(items: T[], keep: (item: T) => boolean): T[] {
  const next = items.filter(keep);
  return next.length > 0 ? next : items;
}

function matchLink(text: string, client: Client): string | null {
  const lower = text.toLowerCase().replace(/\s+/g, ' ');
  let pool = client.links;
  const metro = /\bmetro\b/.test(lower);
  const internet = /\binternet\b/.test(lower);
  if (metro !== internet) {
    pool = filterIfSome(pool, (link) => (metro ? /metro/i.test(link.name) : /internet/i.test(link.name)));
  }
  const backup = /backup/.test(lower);
  const main = /main\s*link|mainlink|mainlik|via main/.test(lower);
  if (backup !== main) {
    pool = filterIfSome(pool, (link) => (backup ? link.role === 'Backuplink' : link.role === 'Mainlink'));
  }
  const gedungA = /gedung\s*a\b/.test(lower);
  const gedungC = /gedung\s*c\b/.test(lower);
  if (gedungA !== gedungC) {
    pool = filterIfSome(pool, (link) => (gedungA ? /gedung\s*a/i.test(link.name) : /gedung\s*c/i.test(link.name)));
  }
  return pool.length === 1 ? pool[0].id : null;
}

function hasMetrics(side: Partial<Side> | null): boolean {
  return Boolean(side && (side.current || side.avg || side.max));
}

function isoDate(year: string, month: string, day: string): string | null {
  const value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  return isIsoDate(value) ? value : null;
}

function matchDate(text: string): string | null {
  const from = text.match(/from[^\n]{0,40}?(\d{4})[/. -](\d{1,2})[/. -](\d{1,2})/i);
  if (from) return isoDate(from[1], from[2], from[3]);
  const ymd = text.match(/\b(\d{4})[/. -](\d{1,2})[/. -](\d{1,2})\b/);
  if (ymd) return isoDate(ymd[1], ymd[2], ymd[3]);
  const dmy = text.match(/\b(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})\b/);
  if (dmy) return isoDate(dmy[3], dmy[2], dmy[1]);
  const months: Record<string, string> = {
    januari: '01', jan: '01', februari: '02', feb: '02', maret: '03', mar: '03',
    april: '04', apr: '04', mei: '05', juni: '06', jun: '06', juli: '07', jul: '07',
    agustus: '08', agu: '08', aug: '08', september: '09', sep: '09', sept: '09',
    oktober: '10', okt: '10', oct: '10', november: '11', nov: '11', desember: '12', des: '12', dec: '12',
  };
  const named = text.match(/\b(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})\b/i);
  if (named) {
    const month = months[named[2].toLowerCase()];
    if (month) return isoDate(named[3], month, named[1]);
  }
  return null;
}

export function parseGraphText(text: string, client: Client): GraphReading {
  const cleaned = text
    .replace(/lnbound/gi, 'Inbound')
    .replace(/0utbound/gi, 'Outbound')
    .replace(/[|]/g, ' ');
  const download = extractExplicit(cleaned, 'download') ?? extractLegend(cleaned, /in\W{0,2}bound/i);
  const upload = extractExplicit(cleaned, 'upload') ?? extractLegend(cleaned, /out\W{0,2}bound/i);
  const linkId = matchLink(cleaned, client);
  const windowId = matchWindow(cleaned, client);
  const date = matchDate(cleaned);
  const link = client.links.find((item) => item.id === linkId);
  const window = client.windows.find((item) => item.id === windowId);
  const readable = cleaned.trim().length > 0;
  const numbers = hasMetrics(download) || hasMetrics(upload);
  let note = '';
  if (!readable) {
    note = 'Teks pada gambar tidak terbaca.';
  } else if (!numbers && !link && !window && !date) {
    note = 'Angka, jam, hari, dan tanggal tidak terbaca.';
  } else {
    const bits = [
      date ? formatLongDate(date) : 'tanggal tidak terbaca',
      link ? `${link.name} ${link.role}` : 'nama link tidak terbaca',
      window ? window.label : 'jam tidak terbaca, slot tidak diisi',
      numbers ? 'angka terisi' : 'angka tidak terbaca',
    ];
    note = `Terbaca: ${bits.join(' · ')}.`;
  }
  return { linkId, windowId, date, download, upload, note };
}

export function mergeSide(current: Side, incoming: Partial<Side> | null): Side {
  if (!incoming) return current;
  return {
    current: incoming.current ?? current.current,
    avg: incoming.avg ?? current.avg,
    max: incoming.max ?? current.max,
  };
}

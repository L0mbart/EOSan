import { addDays, formatLongDate, formatMonth, parseIso, todayIso, toIso } from './dates';
import type { Cadence, Contract, Report } from './types';

export function contractPhase(contract: Contract, today = todayIso()): 'scheduled' | 'active' | 'closed' {
  if (contract.startDate > today) return 'scheduled';
  if (contract.endDate < today) return 'closed';
  return 'active';
}

export function phaseLabel(phase: 'scheduled' | 'active' | 'closed'): string {
  if (phase === 'scheduled') return 'Belum mulai';
  if (phase === 'closed') return 'Selesai';
  return 'Berjalan';
}

export function periodBounds(cadence: Cadence, today = todayIso()): { start: string; end: string; label: string } {
  const date = parseIso(today);
  if (cadence === 'day') return { start: today, end: today, label: formatLongDate(today) };
  if (cadence === 'week') {
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const start = toIso(monday);
    const end = toIso(sunday);
    return { start, end, label: `${formatLongDate(start)} – ${formatLongDate(end)}` };
  }
  if (cadence === 'month') {
    const start = toIso(new Date(date.getFullYear(), date.getMonth(), 1));
    const end = toIso(new Date(date.getFullYear(), date.getMonth() + 1, 0));
    return { start, end, label: formatMonth(start) };
  }
  const year = date.getFullYear();
  return { start: `${year}-01-01`, end: `${year}-12-31`, label: String(year) };
}

function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  if (!start || !end || start > end) return days;
  let cursor = start;
  while (cursor <= end && days.length < 400) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function dutyDays(contract: Contract, start: string, end: string, today = todayIso()): string[] {
  const from = contract.startDate > start ? contract.startDate : start;
  const untilContract = contract.endDate < end ? contract.endDate : end;
  const until = untilContract < today ? untilContract : today;
  return eachDay(from, until);
}

export function reportsForContract(reports: Report[], contract: Contract): Report[] {
  return reports.filter((report) => report.contractId === contract.id || (!report.contractId && report.clientId === contract.customerId));
}

export function coverage(contract: Contract, reports: Report[], start: string, end: string, today = todayIso()): {
  expected: number;
  filed: number;
  missing: string[];
  percent: number;
} {
  const days = dutyDays(contract, start, end, today);
  const filedDates = new Set(
    reportsForContract(reports, contract)
      .filter((report) => report.status !== 'draft' && report.date >= start && report.date <= end)
      .map((report) => report.date),
  );
  const missing = days.filter((day) => !filedDates.has(day));
  const filed = days.length - missing.length;
  const percent = days.length === 0 ? 0 : Math.round((filed / days.length) * 100);
  return { expected: days.length, filed, missing, percent };
}

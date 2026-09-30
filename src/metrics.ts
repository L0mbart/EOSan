import { findClient } from './clients';
import type { Metric, Report, Side, TrafficSlot, Unit } from './types';

export function blankMetric(unit: Unit = 'Mbps'): Metric {
  return { value: '', unit };
}

export function blankSide(): Side {
  return { current: blankMetric(), avg: blankMetric(), max: blankMetric() };
}

export function toKbps(metric: Metric): number | null {
  const raw = metric.value.trim().replace(',', '.');
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return metric.unit === 'Mbps' ? value * 1000 : value;
}

export function metricInconsistent(avg: Metric, max: Metric): boolean {
  const average = toKbps(avg);
  const maximum = toKbps(max);
  if (average == null || maximum == null) return false;
  return average > maximum * 1.02;
}

export function formatMetric(metric: Metric): string {
  const value = metric.value.trim();
  if (!value) return '—';
  return `${value} ${metric.unit}`;
}

export function slotHasValue(slot: TrafficSlot): boolean {
  const fields = [slot.download, slot.upload].flatMap((side) => [side.current, side.avg, side.max]);
  return fields.some((metric) => metric.value.trim().length > 0);
}

export function issueCount(slot: TrafficSlot): number {
  return Number(metricInconsistent(slot.download.avg, slot.download.max)) +
    Number(metricInconsistent(slot.upload.avg, slot.upload.max));
}

export function linkIssueCount(report: Report, linkId: string): number {
  return (report.slots[linkId] ?? []).reduce((sum, slot) => sum + issueCount(slot), 0);
}

export function reportIssueCount(report: Report): number {
  return Object.keys(report.slots).reduce((sum, linkId) => sum + linkIssueCount(report, linkId), 0);
}

export function filledWindowCount(report: Report): number {
  return Object.values(report.slots).reduce(
    (sum, slots) => sum + slots.filter(slotHasValue).length,
    0,
  );
}

export function lastFilledSlot(report: Report, linkId: string): TrafficSlot | undefined {
  const client = findClient(report.clientId);
  const slots = report.slots[linkId] ?? [];
  for (let index = client.windows.length - 1; index >= 0; index -= 1) {
    const windowId = client.windows[index]?.id;
    const slot = slots.find((item) => item.windowId === windowId);
    if (slot && slotHasValue(slot)) return slot;
  }
  return undefined;
}

export function toggleUnit(unit: Unit): Unit {
  return unit === 'Mbps' ? 'Kbps' : 'Mbps';
}

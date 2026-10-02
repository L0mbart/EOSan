import { isIsoDate, parseIso, todayIso } from './dates';

export type ContractKind = 'active' | 'ending' | 'ended' | 'inactive' | 'standby' | 'scheduled';

export function daysUntil(end: string, today = todayIso()): number | null {
  if (!isIsoDate(end) || !isIsoDate(today)) return null;
  return Math.round((parseIso(end).getTime() - parseIso(today).getTime()) / 86_400_000);
}

export function contractKind(input: {
  start?: string;
  end?: string;
  inactive?: boolean;
  standby?: boolean;
  today?: string;
}): { kind: ContractKind; days: number | null } {
  const today = input.today ?? todayIso();
  if (input.inactive) return { kind: 'inactive', days: null };
  const days = input.end ? daysUntil(input.end, today) : null;
  if (days !== null && days < 0) return { kind: 'ended', days };
  if (input.start && isIsoDate(input.start) && input.start > today) return { kind: 'scheduled', days };
  if (days !== null && days <= 30) return { kind: 'ending', days };
  if (input.standby) return { kind: 'standby', days };
  return { kind: 'active', days };
}

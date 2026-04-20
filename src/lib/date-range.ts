const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function startOfDayUtc(date: string | null | undefined): Date | null {
  if (!date || !ISO_DATE.test(date)) return null;
  return new Date(`${date}T00:00:00.000Z`);
}

export function endOfDayUtc(date: string | null | undefined): Date | null {
  if (!date || !ISO_DATE.test(date)) return null;
  return new Date(`${date}T23:59:59.999Z`);
}

export function startOfDayUtcIso(date: string | null | undefined): string | null {
  const d = startOfDayUtc(date);
  return d ? d.toISOString() : null;
}

export function endOfDayUtcIso(date: string | null | undefined): string | null {
  const d = endOfDayUtc(date);
  return d ? d.toISOString() : null;
}

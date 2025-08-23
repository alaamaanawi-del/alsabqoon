export function fmtYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}
export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function daysInMonth(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth();
  return new Date(y, m + 1, 0).getDate();
}
export function dayOfWeek(d: Date) {
  // 0 Sunday ... 6 Saturday
  return d.getDay();
}
export function colorForScore(n: number) {
  if (n >= 61) return '#16a34a';
  if (n >= 31) return '#f59e0b';
  return '#ef4444';
}
export function hijriDayString(date: Date): string {
  try {
    const fmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric' } as any);
    return fmt.format(date);
  } catch {
    return '-';
  }
}
export function hijriFullString(date: Date): string {
  try {
    const fmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } as any);
    return fmt.format(date);
  } catch {
    return '-';
  }
}
export function gregFullString(date: Date): string {
  try {
    const fmt = new Intl.DateTimeFormat('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } as any);
    return fmt.format(date);
  } catch {
    return fmtYMD(date);
  }
}
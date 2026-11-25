/** Today in Stockholm as YYYY-MM-DD ("new today" and the contract rule are decided on Stockholm's calendar). */
export const stockholmToday = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(now);   // sv-SE prints YYYY-MM-DD

/** The next weekday after `now` in Stockholm, as YYYYMMDD: the day the travel matrix is routed for. */
export function nextWeekday(now: Date): string {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Stockholm' }).format(now).split('-').map(Number) as [number, number, number];
  const day = new Date(Date.UTC(y, m - 1, d + 1));
  while (day.getUTCDay() === 0 || day.getUTCDay() === 6) day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10).replaceAll('-', '');
}

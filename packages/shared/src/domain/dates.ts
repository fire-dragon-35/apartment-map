/** Today in Stockholm as YYYY-MM-DD ("new today" and the contract rule are decided on Stockholm's calendar). */
export const stockholmToday = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(now);   // sv-SE prints YYYY-MM-DD

export interface Clock {
  /** Today in Stockholm, as an ISO day. */
  today(): string;
  now(): Date;
}

export const systemClock: Clock = {
  today: () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(new Date()), // sv-SE prints YYYY-MM-DD
  now: () => new Date(),
};

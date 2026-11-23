import { stockholmToday } from '@lk/shared';

export interface Clock {
  /** Today in Stockholm, as an ISO day. */
  today(): string;
  now(): Date;
}

export const systemClock: Clock = {
  today: () => stockholmToday(),
  now: () => new Date(),
};

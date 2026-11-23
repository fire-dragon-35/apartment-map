// zod free, so pages can import the source names without pulling in the validation library
export const SOURCES = ['qasa', 'homeq', 'bostadsformedlingen', 'samtrygg', 'facebook'] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_NAMES: Record<Source, string> = {
  qasa: 'Qasa',
  homeq: 'HomeQ',
  bostadsformedlingen: 'Bostadsförmedlingen',
  samtrygg: 'Samtrygg',
  facebook: 'Facebook',
};

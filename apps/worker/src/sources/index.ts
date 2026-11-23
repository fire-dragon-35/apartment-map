import { Bostadsformedlingen } from './bostadsformedlingen.ts';
import { HomeQ } from './homeq.ts';
import { Qasa } from './qasa.ts';
import { Samtrygg } from './samtrygg.ts';

/** Every site the worker fetches. Add a source here and nowhere else. */
export const ADAPTERS = [new Qasa(), new HomeQ(), new Bostadsformedlingen(), new Samtrygg()];
export type { SourceResult } from './base.ts';

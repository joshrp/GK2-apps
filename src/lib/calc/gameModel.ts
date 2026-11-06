import { gk2Data } from '#lib/data/gk2';
import { buildModel } from './model';

/** The calculator's model of the built-in game data. */
export const gameModel = buildModel(gk2Data);

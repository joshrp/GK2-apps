import type { Gk2Data } from '../../../data_export/gk2-data.d.ts';
import raw from '../../../data_export/gk2-data.json';

export type * from '../../../data_export/gk2-data.d.ts';
export const gk2Data = raw as unknown as Gk2Data;

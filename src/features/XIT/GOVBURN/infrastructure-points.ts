import type { Need } from '@src/core/population/engine';

// Need points one supplied upkeep material gives per building level, and the needs it serves.
// Source: Archiel's Governor Helper (Upkeep sheet), as used by the governor helper page.
export const INFRASTRUCTURE_POINTS: Record<string, { points: number; needs: Need[] }> = {
  SST: { points: 833.33, needs: ['SAFETY'] },
  SDP: { points: 1250, needs: ['SAFETY'] },
  EMC: { points: 200, needs: ['SAFETY', 'HEALTH'] },
  INF: { points: 833.33, needs: ['HEALTH'] },
  HOS: { points: 833.33, needs: ['HEALTH'] },
  WCE: { points: 166.67, needs: ['HEALTH', 'COMFORT'] },
  PAR: { points: 500, needs: ['COMFORT'] },
  '4DA': { points: 833.33, needs: ['COMFORT'] },
  ACA: { points: 166.67, needs: ['COMFORT', 'CULTURE'] },
  ART: { points: 625, needs: ['CULTURE'] },
  VRT: { points: 833.33, needs: ['CULTURE'] },
  PBH: { points: 166.67, needs: ['CULTURE', 'EDUCATION'] },
  LIB: { points: 500, needs: ['EDUCATION'] },
  UNI: { points: 833.33, needs: ['EDUCATION'] },
};

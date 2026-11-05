import { userData } from '@src/store/user-data';

// Default planets the player watches for each resource (player list, 2026-11-04).
// XIT EXTRACT edits the copy in userData.extract.
export const defaultWatchedPlanets: Record<string, string[]> = {
  AMM: ['AM-528g'],
  ALO: ['BI-500b'],
  AR: ['KI-401d', 'RC-040f'],
  AUO: ['ZK-602b', 'GY-694i'],
  BER: ['YI-280j', 'YP-888a'],
  BTS: ['AW-006a', 'XD-311b'],
  CLI: ['WR-681a', 'KI-439a', 'KW-358i', 'WC-702b', 'VH-241e', 'DW-419c', 'SE-110a'],
  GAL: ['SL-132a', 'IY-387a'],
  H: ['VH-331i'],
  H2O: ['FK-794b'],
  HAL: ['XD-311a'],
  HE3: ['VH-043e', 'CH-115e'],
  LES: ['IY-028b'],
  LIO: ['YI-280e', 'GY-252a'],
  LST: ['AJ-946a', 'YP-131d'],
  MGS: ['YI-552c'],
  N: ['WB-947h'],
  O: ['FK-037b'],
  SIO: ['YP-888b'],
  ZIR: ['KI-401b'],
};

// Resources the player does not want to see, by default.
export const defaultHiddenResources = ['HEX', 'MAG'];

export function watchedPlanetsOf(ticker: string) {
  return userData.extract.planets[ticker] ?? [];
}

export function isHiddenResource(ticker: string) {
  return userData.extract.hidden.includes(ticker);
}

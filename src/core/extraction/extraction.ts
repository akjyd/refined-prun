import type { PriceFn, ProfitData } from '@src/core/daily-profit/daily-profit';

// Daily profit of one extraction base, as in the production cost page.
// The base uses the PRUNplanner optimal layout of the extractor (EXT 14, RIG 35, COL 22),
// 5 experts and the COGC of the planet: x1.25 for resource extraction, x1.1 for pioneers.
// Building materials include the planet environment materials.

// Planet resource type: M mineral, L liquid, G gas.
export type ResourceType = 'M' | 'L' | 'G';

// [planet, type, factor]
export type ResourceSite = [string, ResourceType, number];

export interface PlanetInfo {
  name: string;
  rocky: boolean;
  gravity: number;
  pressure: number;
  temperature: number;
  // COGC program without the ADVERTISING_ prefix, or '' when there is none.
  cogc: string;
}

// Extractor, output factor, base cycle in hours.
const EXTRACTORS: Record<ResourceType, [string, number, number]> = {
  M: ['EXT', 0.7, 12],
  L: ['RIG', 0.7, 4.8],
  G: ['COL', 0.6, 6],
};

// Extractors are not in the production data, so they are listed here.
// Workers (pioneers), area and build costs from FIO /building/allbuildings.
const EXTRACTOR_BUILDINGS: Record<string, { pioneers: number; area: number; bse: number }> = {
  EXT: { pioneers: 60, area: 25, bse: 16 },
  RIG: { pioneers: 30, area: 10, bse: 12 },
  COL: { pioneers: 50, area: 15, bse: 16 },
};

const EXPERTS = 1 + 0.284;
const DAYS_PER_REPAIR = 180;

export function environmentMaterials(area: number, planet: PlanetInfo) {
  const m: Record<string, number> = planet.rocky ? { MCG: area * 4 } : { AEF: Math.ceil(area / 3) };
  if (planet.gravity < 0.25) {
    m.MGC = 1;
  } else if (planet.gravity > 2.5) {
    m.BL = 1;
  }
  if (planet.pressure < 0.25) {
    m.SEA = area;
  } else if (planet.pressure > 2) {
    m.HSE = 1;
  }
  if (planet.temperature < -25) {
    m.INS = area * 10;
  } else if (planet.temperature > 75) {
    m.TSH = 1;
  }
  return m;
}

export function cogcFactor(cogc: string) {
  if (cogc === 'RESOURCE_EXTRACTION') {
    return 1.25;
  }
  return cogc === 'WORKFORCE_PIONEERS' ? 1.1 : 1;
}

export interface ExtractionResult {
  building: string;
  count: number;
  // Units per day of the whole base.
  output: number;
  // Undefined when a price is missing.
  profit?: number;
}

export function extractionProfit(
  data: ProfitData,
  ticker: string,
  site: ResourceSite,
  planet: PlanetInfo,
  price: PriceFn,
): ExtractionResult {
  const [building, k, cycle] = EXTRACTORS[site[1]];
  const b = EXTRACTOR_BUILDINGS[building];
  const count = data.optimal[building]?.[0] ?? Math.floor(475 / b.area);
  const daily = site[2] * 100 * k;
  const amount = Math.ceil((daily * cycle) / 24);
  const hours = (amount / daily) * 24;
  const efficiency = cogcFactor(planet.cogc) * EXPERTS;
  const runs = 24 / (hours / efficiency);
  const output = count * runs * amount;

  const costs: Record<string, number> = { BSE: b.bse };
  for (const [t, n] of Object.entries(environmentMaterials(b.area, planet))) {
    costs[t] = (costs[t] ?? 0) + n;
  }
  let missing = false;
  const value = (t: string) => {
    const v = price(t);
    if (v === undefined) {
      missing = true;
      return 0;
    }
    return v;
  };
  const buildCost = sumBy(Object.entries(costs), ([t, n]) => value(t) * n);
  const workforce = sumBy(
    Object.entries(data.needs[0] ?? {}),
    ([t, n]) => (value(t) * n * b.pioneers) / 100,
  );
  const revenue = runs * amount * value(ticker);
  const profit = count * (revenue - workforce - buildCost / DAYS_PER_REPAIR);
  return { building, count, output, profit: missing ? undefined : profit };
}

// Jumps from every system to the start systems, by breadth-first search over the star map.
export function jumpsFrom(start: string, connections: Map<string, string[]>) {
  const jumps = new Map<string, number>([[start, 0]]);
  let frontier = [start];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      const d = jumps.get(id)!;
      for (const n of connections.get(id) ?? []) {
        if (!jumps.has(n)) {
          jumps.set(n, d + 1);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return jumps;
}

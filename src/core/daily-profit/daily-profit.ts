import snapshot from './daily-profit-data.json';

// Daily profit of one base that runs one recipe all day, as in the PRUNplanner ROI overview.
// The base uses the PRUNplanner optimal base layout of the building (building count and
// housing, at most 500 area with the core module), COGC of the building expertise (x1.25)
// and 5 experts. The planet is rocky with normal conditions (only MCG is added).
// Profit = count × (runs per day × (outputs × price − inputs × price)
//          − workforce consumables per day − building cost ÷ 180).
// Housing costs are not counted.

export interface Recipe {
  key: string;
  building: string;
  hours: number;
  inputs: Record<string, number>;
  outputs: Record<string, number>;
}

export interface Building {
  // Workers per tier: pioneers, settlers, technicians, engineers, scientists.
  workers: number[];
  area: number;
  costs: Record<string, number>;
}

export interface ProfitData {
  recipes: Recipe[];
  buildings: Record<string, Building>;
  // Consumables per 100 workers per day, one entry per tier.
  needs: Record<string, number>[];
  // Building count and area (without the core module) of the optimal base.
  optimal: Record<string, [number, number]>;
  // Materials found on planets. They count as raw materials, not as recipe products.
  extractable: Set<string>;
}

export type PriceFn = (ticker: string) => number | undefined;

// 5 experts.
const EFFICIENCY = 1.25 * (1 + 0.284);
const DAYS_PER_REPAIR = 180;

function amounts(list: [string, number][]) {
  return Object.fromEntries(list);
}

export function recipeKey(
  building: string,
  inputs: Record<string, number>,
  outputs: Record<string, number>,
) {
  const side = (x: Record<string, number>) =>
    Object.keys(x)
      .sort()
      .map(t => `${x[t]}x${t}`)
      .join(' ');
  return `${building}:${side(inputs)}=>${side(outputs)}`;
}

// Workers per tier, area, expertise, build costs.
type SnapshotBuilding = [
  number,
  number,
  number,
  number,
  number,
  number,
  string,
  [string, number][],
];

interface Snapshot {
  recipes: [string, number, [string, number][], [string, number][]][];
  buildings: Record<string, SnapshotBuilding>;
  needs: Record<string, number>[];
  optimal: Record<string, [number, number]>;
  extractable: string[];
}

function fromSnapshot(): ProfitData {
  const data = snapshot as unknown as Snapshot;
  const recipes = data.recipes.map(([building, hours, inputs, outputs]) => {
    const i = amounts(inputs);
    const o = amounts(outputs);
    return { key: recipeKey(building, i, o), building, hours, inputs: i, outputs: o };
  });
  const buildings: Record<string, Building> = {};
  for (const [ticker, b] of Object.entries(data.buildings)) {
    buildings[ticker] = { workers: b.slice(0, 5) as number[], area: b[5], costs: amounts(b[7]) };
  }
  return {
    recipes,
    buildings,
    needs: data.needs,
    optimal: data.optimal,
    extractable: new Set(data.extractable),
  };
}

export const embeddedProfitData = fromSnapshot();

export function recipesByOutput(data: ProfitData) {
  const map = new Map<string, Recipe[]>();
  for (const recipe of data.recipes) {
    for (const ticker of Object.keys(recipe.outputs)) {
      if (data.extractable.has(ticker)) {
        continue;
      }
      const list = map.get(ticker) ?? [];
      list.push(recipe);
      map.set(ticker, list);
    }
  }
  return map;
}

function valueOf(materials: Record<string, number>, price: PriceFn) {
  let total = 0;
  for (const [ticker, amount] of Object.entries(materials)) {
    const value = price(ticker);
    if (value === undefined) {
      return undefined;
    }
    total += value * amount;
  }
  return total;
}

// Returns undefined when a needed price is missing.
export function dailyProfit(data: ProfitData, recipe: Recipe, price: PriceFn) {
  const building = data.buildings[recipe.building];
  if (building === undefined || recipe.hours <= 0) {
    return undefined;
  }
  const count = data.optimal[recipe.building]?.[0] ?? Math.floor(475 / building.area);
  let workforce = 0;
  for (let tier = 0; tier < building.workers.length; tier++) {
    const value = valueOf(data.needs[tier] ?? {}, price);
    if (value === undefined) {
      return undefined;
    }
    workforce += (value * building.workers[tier]) / 100;
  }
  const costs = { ...building.costs };
  costs.MCG = (costs.MCG ?? 0) + building.area * 4;
  const buildCost = valueOf(costs, price);
  // An output without a price counts as 0, like a by-product nobody buys.
  const revenue = sumBy(Object.entries(recipe.outputs), ([t, n]) => (price(t) ?? 0) * n);
  const inputCost = valueOf(recipe.inputs, price);
  if (buildCost === undefined || inputCost === undefined) {
    return undefined;
  }
  const runs = 24 / (recipe.hours / EFFICIENCY);
  return count * (runs * (revenue - inputCost) - workforce - buildCost / DAYS_PER_REPAIR);
}

// True when the material has the largest output value of the recipe. A recipe where the
// material is only a by-product (AL in AML, where BE has most of the value) returns false.
export function isMainProduct(recipe: Recipe, ticker: string, price: PriceFn) {
  const value = (t: string) => (price(t) ?? 0) * (recipe.outputs[t] ?? 0);
  const own = value(ticker);
  return Object.keys(recipe.outputs).every(t => value(t) <= own);
}

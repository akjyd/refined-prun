import { MaterialBurn } from '@src/core/burn';

// One click on a docked ship: put the supplies it carries into the base, then load the goods
// the base has made (player, 2026-11-07).
//
// Supplies go down, goods come up:
//   - Every material the base consumes is topped up to the days set for that planet. No days
//     set means everything the ship carries goes down.
//   - Goods the planet makes and does not consume are all loaded.
//   - A material the planet makes and also consumes is an intermediate: the days set for
//     intermediates stay on the planet and the rest is loaded.
//
// The base store can fill up. What does not fit goes to the warehouse, and when that is full
// too the unload stops there and the loading still runs.

export interface Space {
  weight: number;
  volume: number;
}

export interface ResupplyMaterial {
  ticker: string;
  weight: number;
  volume: number;
}

export interface ResupplyInput {
  // The burn of the planet, by ticker.
  burn: Record<string, MaterialBurn>;
  // What the ship holds, by ticker.
  onShip: Record<string, number>;
  // Weight and volume of one unit of each ticker.
  sizes: Record<string, ResupplyMaterial>;
  // Days of supply the base should hold. Undefined unloads everything the ship carries.
  supplyDays?: number;
  // Days of an intermediate that stay on the planet.
  intermediateDays: number;
  baseSpace: Space;
  warehouseSpace?: Space;
  shipSpace: Space;
}

export type Bill = Record<string, number>;

export interface ResupplyPlan {
  toBase: Bill;
  toWarehouse: Bill;
  toShip: Bill;
  // True when a material could not go down because both stores are full.
  baseFull: boolean;
  // True when a material could not come up because the ship is full.
  shipFull: boolean;
}

function fits(space: Space, size: ResupplyMaterial, units: number) {
  const byWeight = size.weight > 0 ? Math.floor(space.weight / size.weight) : units;
  const byVolume = size.volume > 0 ? Math.floor(space.volume / size.volume) : units;
  return Math.max(0, Math.min(units, byWeight, byVolume));
}

function take(space: Space, size: ResupplyMaterial, units: number) {
  space.weight -= units * size.weight;
  space.volume -= units * size.volume;
}

function add(bill: Bill, ticker: string, units: number) {
  if (units > 0) {
    bill[ticker] = (bill[ticker] ?? 0) + units;
  }
}

export function planResupply(input: ResupplyInput): ResupplyPlan {
  const plan: ResupplyPlan = {
    toBase: {},
    toWarehouse: {},
    toShip: {},
    baseFull: false,
    shipFull: false,
  };
  const base = { ...input.baseSpace };
  const warehouse = input.warehouseSpace ? { ...input.warehouseSpace } : undefined;
  const ship = { ...input.shipSpace };

  // Down: what the base is short of, of everything the ship carries.
  for (const [ticker, held] of Object.entries(input.onShip)) {
    const size = input.sizes[ticker];
    const mat = input.burn[ticker];
    if (size === undefined || held <= 0 || mat === undefined) {
      continue;
    }
    const consumed = -Math.min(0, mat.dailyAmount);
    if (consumed <= 0) {
      continue;
    }
    const want =
      input.supplyDays === undefined
        ? held
        : Math.max(0, Math.ceil(input.supplyDays * consumed - mat.inventory));
    let left = Math.min(held, want);
    const toBase = fits(base, size, left);
    take(base, size, toBase);
    add(plan.toBase, ticker, toBase);
    left -= toBase;
    if (left > 0 && warehouse) {
      const toWarehouse = fits(warehouse, size, left);
      take(warehouse, size, toWarehouse);
      add(plan.toWarehouse, ticker, toWarehouse);
      left -= toWarehouse;
    }
    if (left > 0) {
      plan.baseFull = true;
    }
    // The space the ship gives up is space for the goods.
    take(ship, size, -(toBase + (plan.toWarehouse[ticker] ?? 0)));
  }

  // Up: the goods of the planet, minus the days of an intermediate that stay.
  for (const [ticker, mat] of Object.entries(input.burn)) {
    const size = input.sizes[ticker];
    if (size === undefined || mat.output <= 0 || mat.inventory <= 0) {
      continue;
    }
    // A material the planet also consumes keeps its days here.
    const keep = mat.input > 0 ? Math.ceil(input.intermediateDays * mat.input) : 0;
    const spare = Math.max(0, mat.inventory - keep);
    if (spare <= 0) {
      continue;
    }
    const loaded = fits(ship, size, spare);
    take(ship, size, loaded);
    add(plan.toShip, ticker, loaded);
    if (loaded < spare) {
      plan.shipFull = true;
    }
  }
  return plan;
}

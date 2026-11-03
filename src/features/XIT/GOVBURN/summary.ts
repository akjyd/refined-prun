import {
  capFulfillment,
  effectiveUnemployment,
  forecast,
  NEEDS,
  PerTier,
  Report,
  requiredNeeds,
  TIERS,
  weekHappiness,
} from '@src/core/population/engine';
import { cogcDays, cogcPaid, materialDays, resolveSlots } from '@src/features/XIT/GOVBURN/utils';
import { INFRASTRUCTURE_POINTS } from '@src/features/XIT/GOVBURN/infrastructure-points';
import { getPrice } from '@src/infrastructure/fio/cx';
import { warehousesStore } from '@src/infrastructure/prun-api/data/warehouses';
import { storagesStore } from '@src/infrastructure/prun-api/data/storage';
import { userData } from '@src/store/user-data';
import { BASE_POINTS } from '@src/core/population/engine';

const DAYS_IN_WEEK = 7;
// The CoGC upkeep is paid every 10 days.
const COGC_PERIOD_DAYS = 10;

// A building store as a battery: one cell is one consumption tick.
export interface Battery {
  cells: number;
  filled: number;
}

export interface SlotView {
  ticker: string;
  on: boolean;
  // Days the material in the building lasts.
  days: number;
  battery: Battery;
  // Cost of one need point per day; undefined without a price.
  pointCost?: number;
  // Days the planet warehouse stock of this material lasts for all selected slots.
  warehouseDays?: number;
}

export interface BuildingView {
  ticker: string;
  level: number;
  hasData: boolean;
  slots: SlotView[];
  days?: number;
  warehouseDays?: number;
  weeklyCost: number;
}

export interface CogcView {
  paid: boolean;
  materials: { ticker: string; amount: number }[];
  days: number;
  warehouseDays?: number;
  weeklyCost: number;
}

export interface Change {
  now: number;
  next: number;
}

export interface PlanetStats {
  population: Record<string, Change>;
  happiness: Record<string, Change>;
  // Uncapped need fulfillment from the selected slots, SAFETY..EDUCATION.
  needs: Change[];
}

export interface PlanetView {
  naturalId: string;
  weeklyCost: number;
  days?: number;
  // The battery of the selected slot that runs out first.
  battery?: Battery;
  warehouseDays?: number;
  cogc?: CogcView;
  buildings: BuildingView[];
  stats?: PlanetStats;
}

const MS_IN_DAY = 24 * 60 * 60 * 1000;

// Ticks left now: the captured amount minus the ticks that happened since the capture.
// A building store holds 30 days of a material when no capacity was captured.
export function upkeepBattery(upkeep: UserData.GovBurnUpkeep, now: number): Battery {
  if (upkeep.amount <= 0) {
    return { cells: 0, filled: 0 };
  }
  const durationMs = upkeep.duration * MS_IN_DAY;
  const passed =
    now >= upkeep.nextTick && durationMs > 0
      ? Math.floor((now - upkeep.nextTick) / durationMs) + 1
      : 0;
  const capacity = upkeep.storeCapacity ?? (30 / upkeep.duration) * upkeep.amount;
  return {
    cells: Math.max(1, Math.round(capacity / upkeep.amount)),
    filled: Math.max(0, Math.floor(upkeep.stored / upkeep.amount) - passed),
  };
}

function minOf(values: (number | undefined)[]) {
  const known = values.filter((x): x is number => x !== undefined && Number.isFinite(x));
  return known.length > 0 ? Math.min(...known) : undefined;
}

function warehouseAmounts(naturalId: string) {
  const warehouse = warehousesStore.getByEntityNaturalId(naturalId);
  const store = storagesStore.getById(warehouse?.storeId);
  const amounts = new Map<string, number>();
  for (const item of store?.items ?? []) {
    const ticker = item.quantity?.material.ticker;
    if (ticker !== undefined) {
      amounts.set(ticker, (amounts.get(ticker) ?? 0) + (item.quantity?.amount ?? 0));
    }
  }
  return amounts;
}

// Slots the player keeps supplied: the saved picks, resolved the same way as GOVBURNACT.
export function selectedSlots(naturalId: string, building: UserData.GovBurnBuilding) {
  const n = userData.govburn.config.planets[naturalId]?.[building.ticker] ?? 0;
  const saved = userData.govburn.config.slots[naturalId]?.[building.ticker];
  return new Set(
    resolveSlots(building, n, saved)
      .map(x => x.ticker)
      .filter(x => x !== ''),
  );
}

export function toggleSlot(naturalId: string, building: UserData.GovBurnBuilding, ticker: string) {
  const selected = selectedSlots(naturalId, building);
  if (selected.has(ticker)) {
    selected.delete(ticker);
  } else {
    selected.add(ticker);
  }
  // Keep the upkeep order, as GOVBURNACT does.
  const tickers = (building.upkeeps ?? []).map(x => x.ticker).filter(x => selected.has(x));
  userData.govburn.config.planets[naturalId] ??= {};
  userData.govburn.config.planets[naturalId][building.ticker] = tickers.length;
  userData.govburn.config.slots[naturalId] ??= {};
  userData.govburn.config.slots[naturalId][building.ticker] = tickers;
}

export function buildPlanetView(
  planet: UserData.GovBurnPlanet,
  reports: Report[] | undefined,
  now: number,
): PlanetView {
  const naturalId = planet.naturalId;
  const stock = warehouseAmounts(naturalId);
  const built = planet.buildings.filter(x => x.level > 0);

  // Daily use of each material over all selected slots and the CoGC.
  const dailyUse = new Map<string, number>();
  const addUse = (ticker: string, perDay: number) =>
    dailyUse.set(ticker, (dailyUse.get(ticker) ?? 0) + perDay);
  const selection = new Map(built.map(b => [b.ticker, selectedSlots(naturalId, b)]));
  for (const building of built) {
    for (const upkeep of building.upkeeps ?? []) {
      if (selection.get(building.ticker)?.has(upkeep.ticker) && upkeep.duration > 0) {
        addUse(upkeep.ticker, upkeep.amount / upkeep.duration);
      }
    }
  }
  const cogcMaterials = planet.cogc?.materials ?? [];
  for (const material of cogcMaterials) {
    addUse(material.ticker, material.amount / COGC_PERIOD_DAYS);
  }
  const stockDays = (ticker: string) => {
    const use = dailyUse.get(ticker) ?? 0;
    return use > 0 ? (stock.get(ticker) ?? 0) / use : undefined;
  };

  // Need points supplied by the selected slots and the bases.
  const supplied = NEEDS.map(() => 0);
  if (planet.bases !== undefined) {
    supplied[1] += planet.bases * BASE_POINTS;
    supplied[2] += planet.bases * BASE_POINTS;
  }

  const buildings = built.map((building): BuildingView => {
    const selected = selection.get(building.ticker)!;
    const info = INFRASTRUCTURE_POINTS[building.ticker];
    const slots = (building.upkeeps ?? []).map((upkeep): SlotView => {
      const on = selected.has(upkeep.ticker);
      const perDay = upkeep.duration > 0 ? upkeep.amount / upkeep.duration : 0;
      const price = getPrice(upkeep.ticker);
      const pointCost =
        info !== undefined && price !== undefined
          ? (perDay * price) / (info.points * building.level * info.needs.length)
          : undefined;
      return {
        ticker: upkeep.ticker,
        on,
        days: materialDays(upkeep, now),
        battery: upkeepBattery(upkeep, now),
        pointCost,
        warehouseDays: on ? stockDays(upkeep.ticker) : undefined,
      };
    });
    if (info !== undefined) {
      const lit = slots.filter(x => x.on).length;
      for (const need of info.needs) {
        supplied[NEEDS.indexOf(need)] += lit * info.points * building.level;
      }
    }
    const onSlots = slots.filter(x => x.on);
    const weeklyCost = sumBy(
      (building.upkeeps ?? []).filter(x => selected.has(x.ticker) && x.duration > 0),
      x => (x.amount / x.duration) * DAYS_IN_WEEK * (getPrice(x.ticker) ?? 0),
    );
    return {
      ticker: building.ticker,
      level: building.level,
      hasData: building.upkeeps !== undefined,
      slots,
      days: minOf(onSlots.map(x => x.days)),
      warehouseDays: minOf(onSlots.map(x => x.warehouseDays)),
      weeklyCost,
    };
  });

  let cogc: CogcView | undefined;
  if (planet.cogc !== undefined) {
    cogc = {
      paid: cogcPaid(planet.cogc),
      materials: cogcMaterials.map(x => ({ ticker: x.ticker, amount: x.amount })),
      days: cogcDays(planet.cogc, now),
      warehouseDays: minOf(cogcMaterials.map(x => stockDays(x.ticker))),
      weeklyCost: sumBy(
        cogcMaterials,
        x => (x.amount / COGC_PERIOD_DAYS) * DAYS_IN_WEEK * (getPrice(x.ticker) ?? 0),
      ),
    };
  }

  const levels = Object.fromEntries(planet.buildings.map(x => [x.ticker, x.level]));
  const onSlots = buildings.flatMap(x => x.slots.filter(y => y.on));
  const first = onSlots.reduce<SlotView | undefined>(
    (a, x) => (a === undefined || x.days < a.days ? x : a),
    undefined,
  );
  return {
    battery: first?.battery,
    naturalId,
    weeklyCost: sumBy(buildings, x => x.weeklyCost) + (cogc?.weeklyCost ?? 0),
    days: minOf(buildings.map(x => x.days)),
    warehouseDays: minOf([...buildings.map(x => x.warehouseDays), cogc?.warehouseDays]),
    cogc,
    buildings,
    stats:
      reports !== undefined && reports.length > 0
        ? planetStats(reports, supplied, levels)
        : undefined,
  };
}

// This week: the latest population with the selected supply.
// Next week: the forecast population with the same supply.
function planetStats(reports: Report[], supplied: number[], levels: Record<string, number>) {
  const last = reports.length - 1;
  const report = reports[last];
  const fulfillment = (population: PerTier) => {
    const required = requiredNeeds(population);
    return NEEDS.map((_, i) =>
      i === 0 ? report.fulfillment[0] : required[i] > 0 ? supplied[i] / required[i] : 1,
    );
  };
  const rawNow = fulfillment(report.population);
  const cappedNow = capFulfillment(rawNow);
  const unemployment = effectiveUnemployment(reports, last);
  const next = forecast(reports, last, cappedNow, levels);
  const nextPopulation = Object.fromEntries(TIERS.map(t => [t, next[t].next])) as PerTier;
  const rawNext = fulfillment(nextPopulation);
  const cappedNext = capFulfillment(rawNext);

  const population: Record<string, Change> = {};
  const happiness: Record<string, Change> = {};
  for (const t of TIERS) {
    population[t] = { now: report.population[t], next: nextPopulation[t] };
    happiness[t] = {
      now: weekHappiness(t, cappedNow, unemployment[t], report.explorersGrace),
      next: weekHappiness(t, cappedNext, next[t].unemployment, report.explorersGrace),
    };
  }
  const needs = NEEDS.slice(1).map((_, i) => ({ now: rawNow[i + 1], next: rawNext[i + 1] }));
  return { population, happiness, needs };
}

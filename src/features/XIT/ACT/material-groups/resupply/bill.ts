import { calculatePlanetBurn } from '@src/core/burn';
import { sitesStore } from '@src/infrastructure/prun-api/data/sites';
import { workforcesStore } from '@src/infrastructure/prun-api/data/workforces';
import { productionStore } from '@src/infrastructure/prun-api/data/production';
import { storagesStore } from '@src/infrastructure/prun-api/data/storage';
import type { MaterialFilter } from './config';
import { MaterialBill } from '@src/features/XIT/ACT/material-bill';
import { getEntityNaturalIdFromAddress } from '@src/infrastructure/prun-api/data/addresses';
import { userData } from '@src/store/user-data';

// Compute the planet's resupply bill for a day count; return undefined if inputs or burn data
// are missing. Keep synchronous for reactive use in Configure.
export function computeResupplyBill(
  data: UserData.MaterialGroupData,
  planet: string | undefined,
  days: number | undefined,
  materialFilter?: MaterialFilter,
  // Production-only materials to leave out. Consumables are never left out.
  excluded: string[] = [],
): MaterialBill | undefined {
  if (!planet || days === undefined || isNaN(days)) {
    return undefined;
  }
  const site = sitesStore.getByPlanetNaturalIdOrName(planet);
  if (!site) {
    return undefined;
  }
  const workforce = workforcesStore.getById(site.siteId)?.workforces;
  const production = productionStore.getBySiteId(site.siteId);
  if (workforce === undefined || production === undefined) {
    return undefined;
  }
  const stores = storagesStore.getByAddressableId(site.siteId);

  const filter =
    materialFilter ?? data.materialFilter ?? (data.consumablesOnly ? 'Workforce' : 'All');
  const planetBurn = calculatePlanetBurn(
    production,
    workforce,
    (data.useBaseInv ?? true) ? stores : undefined,
  );

  const exclusions = data.exclusions ?? [];
  const bill: MaterialBill = {};
  for (const ticker of Object.keys(planetBurn)) {
    if (exclusions.includes(ticker)) {
      continue;
    }
    const matBurn = planetBurn[ticker];
    // The player can untick production-only materials. Consumables are always included.
    if (matBurn.workforce === 0 && excluded.includes(ticker)) {
      continue;
    }
    // Filter by primary demand type, but keep full dailyAmount for materials with mixed demand.
    if (filter === 'Workforce' && matBurn.workforce === 0) {
      continue;
    }
    if (filter === 'Production' && matBurn.input === 0) {
      continue;
    }
    if (matBurn.dailyAmount >= 0) {
      continue;
    }
    const consumed = days * -matBurn.dailyAmount;
    const need = Math.max(0, Math.ceil(consumed - matBurn.inventory + 1));
    if (need > 0) {
      bill[ticker] = { quantity: need };
    }
  }
  return bill;
}

// Production-only materials (used by production, not by workforce) that the planet consumes.
// These are the materials the player can untick before a resupply.
export function getProductionOnlyTickers(planet: string | undefined): string[] {
  const site = planet ? sitesStore.getByPlanetNaturalIdOrName(planet) : undefined;
  if (!site) {
    return [];
  }
  const workforce = workforcesStore.getById(site.siteId)?.workforces;
  const production = productionStore.getBySiteId(site.siteId);
  if (workforce === undefined || production === undefined) {
    return [];
  }
  const burn = calculatePlanetBurn(production, workforce, undefined);
  return Object.keys(burn)
    .filter(x => burn[x].workforce === 0 && burn[x].input > 0 && burn[x].dailyAmount < 0)
    .sort();
}

function getPlanetKey(planet: string) {
  const site = sitesStore.getByPlanetNaturalIdOrName(planet);
  return site ? getEntityNaturalIdFromAddress(site.address) : undefined;
}

// Remembered unticked production materials, per planet natural id.
export function getExcludedProduction(planet: string | undefined): string[] {
  const key = planet ? getPlanetKey(planet) : undefined;
  return key ? (userData.settings.burn.resupplyExcluded[key] ?? []) : [];
}

export function setExcludedProduction(planet: string | undefined, tickers: string[]) {
  const key = planet ? getPlanetKey(planet) : undefined;
  if (!key) {
    return;
  }
  if (tickers.length === 0) {
    delete userData.settings.burn.resupplyExcluded[key];
  } else {
    userData.settings.burn.resupplyExcluded[key] = tickers;
  }
}

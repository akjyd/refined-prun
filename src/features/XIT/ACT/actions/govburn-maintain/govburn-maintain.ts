import { act } from '@src/features/XIT/ACT/act-registry';
import Edit from '@src/features/XIT/ACT/actions/govburn-data/Edit.vue';
import { MTRA_TRANSFER } from '@src/features/XIT/ACT/action-steps/MTRA_TRANSFER';
import { CONTRIBUTE } from '@src/features/XIT/ACT/action-steps/CONTRIBUTE';
import { AssertFn } from '@src/features/XIT/ACT/shared-types';
import { planetsStore } from '@src/infrastructure/prun-api/data/planets';
import { sitesStore } from '@src/infrastructure/prun-api/data/sites';
import { storagesStore } from '@src/infrastructure/prun-api/data/storage';
import { warehousesStore } from '@src/infrastructure/prun-api/data/warehouses';
import { populationProjectsStore } from '@src/infrastructure/prun-api/data/population-projects';
import { selectedSlots, upkeepBattery } from '@src/features/XIT/GOVBURN/summary';
import { userData } from '@src/store/user-data';
import { t } from '@src/i18n';

interface Need {
  // Building ticker; undefined for the CoGC.
  building?: string;
  ticker: string;
  amount: number;
  // Lower goes first when the warehouse is short.
  priority: number;
}

// What the selected slots and the CoGC can take now.
// Live project data (open POPID) is used when present, else the captured data.
export function maintenanceNeeds(naturalId: string, now: number): Need[] {
  const planet = userData.govburn.planets[naturalId];
  if (planet === undefined) {
    return [];
  }
  const needs: Need[] = [];
  if (planet.cogc !== undefined) {
    for (const material of planet.cogc.materials) {
      const missing = material.amount - material.currentAmount;
      if (missing > 0) {
        // The CoGC bill has a due date: fill it first.
        needs.push({ ticker: material.ticker, amount: missing, priority: -1 });
      }
    }
  }
  for (const building of planet.buildings) {
    if (building.level <= 0) {
      continue;
    }
    const selected = selectedSlots(naturalId, building);
    const live = populationProjectsStore.getById(building.projectId)?.upkeeps;
    for (const upkeep of building.upkeeps ?? []) {
      if (!selected.has(upkeep.ticker)) {
        continue;
      }
      const current = live?.find(x => x.material.ticker === upkeep.ticker);
      const stored = current?.stored ?? upkeep.stored;
      const capacity = current?.storeCapacity ?? upkeep.storeCapacity;
      if (capacity === undefined) {
        continue;
      }
      const battery = upkeepBattery({ ...upkeep, stored, storeCapacity: capacity }, now);
      // Room = capacity minus what is left after the ticks since the data was read.
      const left = current !== undefined ? stored : battery.filled * upkeep.amount;
      const amount = Math.floor(capacity - left);
      if (amount > 0) {
        needs.push({
          building: building.ticker,
          ticker: upkeep.ticker,
          amount,
          priority: battery.filled,
        });
      }
    }
  }
  return needs;
}

function storeItems(store: PrunApi.Store | undefined) {
  const amounts = new Map<string, number>();
  for (const item of store?.items ?? []) {
    const ticker = item.quantity?.material.ticker;
    if (ticker !== undefined) {
      amounts.set(ticker, (amounts.get(ticker) ?? 0) + (item.quantity?.amount ?? 0));
    }
  }
  return amounts;
}

// Moves what the warehouse has to the base, then contributes it to each building and the CoGC.
act.addAction({
  type: 'GovBurn Maintain',
  shortDescription: t('act.gbm.short'),
  description: action => (action.planet ? t('act.gbm.desc', action.planet) : '--'),
  editComponent: Edit,
  generateSteps: async ctx => {
    const { data, log, emitStep } = ctx;
    const assert: AssertFn = ctx.assert;

    const planet = planetsStore.find(data.planet);
    assert(planet, t('act.gbd.noPlanet'));
    const naturalId = planet.naturalId;

    const warehouse = warehousesStore.getByEntityNaturalId(naturalId);
    const warehouseStore = storagesStore.getById(warehouse?.storeId);
    const site = sitesStore.getByPlanetNaturalIdOrName(naturalId);
    const baseStore = storagesStore.getByAddressableId(site?.siteId)?.find(x => x.type === 'STORE');
    assert(baseStore, t('act.gbm.noBase', naturalId));
    if (warehouseStore === undefined) {
      log.warning(t('act.gbm.noWarehouse', naturalId));
      return;
    }

    const stock = storeItems(warehouseStore);
    const needs = maintenanceNeeds(naturalId, Date.now()).sort((a, b) => a.priority - b.priority);
    const transfers = new Map<string, number>();
    const byTarget = new Map<string, Record<string, number>>();
    for (const need of needs) {
      const available = stock.get(need.ticker) ?? 0;
      const amount = Math.min(need.amount, available);
      if (amount <= 0) {
        continue;
      }
      stock.set(need.ticker, available - amount);
      transfers.set(need.ticker, (transfers.get(need.ticker) ?? 0) + amount);
      const target = need.building ?? '';
      const materials = byTarget.get(target) ?? {};
      materials[need.ticker] = (materials[need.ticker] ?? 0) + amount;
      byTarget.set(target, materials);
    }

    if (transfers.size === 0) {
      log.info(t('act.gbm.nothing', naturalId));
      return;
    }
    for (const [ticker, amount] of transfers) {
      emitStep(MTRA_TRANSFER({ from: warehouseStore.id, to: baseStore.id, ticker, amount }));
    }
    for (const [target, materials] of byTarget) {
      emitStep(
        CONTRIBUTE({
          planet: naturalId,
          building: target === '' ? undefined : target,
          materials,
        }),
      );
    }
  },
});

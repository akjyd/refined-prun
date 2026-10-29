import { act } from '@src/features/XIT/ACT/act-registry';
import Edit from '@src/features/XIT/ACT/actions/refuel/Edit.vue';
import Configure from '@src/features/XIT/ACT/actions/refuel/Configure.vue';
import { Config } from '@src/features/XIT/ACT/actions/refuel/config';
import {
  allExchangesValue,
  allLocationsValue,
  getRefuelOrigins,
} from '@src/features/XIT/ACT/actions/refuel/utils';
import { CXPO_BUY } from '@src/features/XIT/ACT/action-steps/CXPO_BUY';
import { fillAmount } from '@src/features/XIT/ACT/actions/cx-buy/utils';
import { MTRA_TRANSFER } from '@src/features/XIT/ACT/action-steps/MTRA_TRANSFER';
import { ActionStep, AssertFn, configurableValue } from '@src/features/XIT/ACT/shared-types';
import {
  atSameLocation,
  deserializeStorage,
  isCXWarehouse,
  serializeStorage,
} from '@src/features/XIT/ACT/actions/utils';
import { storagesStore } from '@src/infrastructure/prun-api/data/storage';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { getEntityNaturalIdFromAddress } from '@src/infrastructure/prun-api/data/addresses';
import { warehousesStore } from '@src/infrastructure/prun-api/data/warehouses';
import { exchangesStore } from '@src/infrastructure/prun-api/data/exchanges';
import { clamp } from '@src/utils/clamp';
import { Logger } from '@src/features/XIT/ACT/runner/logger';
import { t } from '@src/i18n';

act.addAction<Config>({
  type: 'Refuel',
  shortDescription: t('act.refuel.short'),
  description: action => {
    if (action.origin === allExchangesValue) {
      return t('act.refuel.allDesc');
    }
    if (action.origin === allLocationsValue) {
      return t('act.refuel.allLocationsDesc');
    }
    return action.origin ? t('act.refuel.nearDesc', action.origin) : '--';
  },
  editComponent: Edit,
  configureComponent: Configure,
  needsConfigure: data => {
    return data.origin === configurableValue;
  },
  isValidConfig: (data, config) => {
    return data.origin !== configurableValue || config.origin !== undefined;
  },
  generateSteps: async ctx => {
    const { data, config, log, emitStep } = ctx;
    const assert: AssertFn = ctx.assert;

    const stlMaterial = materialsStore.getByTicker('SF');
    assert(stlMaterial, t('act.refuel.noSF'));

    const ftlMaterial = materialsStore.getByTicker('FF');
    assert(ftlMaterial, t('act.refuel.noFF'));

    if (data.origin === allExchangesValue) {
      const origins = getRefuelOrigins().filter(isCXWarehouse);
      if (origins.length === 0) {
        log.warning(t('act.refuel.noWarehouses'));
        return;
      }
      for (const origin of origins) {
        refuelFromOrigin(origin, data, stlMaterial, ftlMaterial, log, emitStep);
      }
      return;
    }

    if (data.origin === allLocationsValue) {
      // Exchange warehouses first, because only they can buy missing fuel.
      const origins = getRefuelOrigins()
        .filter(x => x.type === 'STORE' || x.type === 'WAREHOUSE_STORE')
        .sort((a, b) => Number(isCXWarehouse(b)) - Number(isCXWarehouse(a)));
      // A ship can be next to more than one storage; refuel it only once.
      const planned = new Set<string>();
      for (const origin of origins) {
        refuelFromOrigin(origin, data, stlMaterial, ftlMaterial, log, emitStep, planned);
      }
      return;
    }

    const serializedOrigin = data.origin === configurableValue ? config?.origin : data.origin;
    const origin = deserializeStorage(serializedOrigin);
    assert(origin, t('act.f.invalidOrigin'));

    refuelFromOrigin(origin, data, stlMaterial, ftlMaterial, log, emitStep);
  },
});

function refuelFromOrigin(
  origin: PrunApi.Store,
  data: UserData.ActionData,
  stlMaterial: PrunApi.Material,
  ftlMaterial: PrunApi.Material,
  log: Logger,
  emitStep: (step: ActionStep) => void,
  planned?: Set<string>,
) {
  const originName = serializeStorage(origin);
  const isFree = (store: PrunApi.Store) => !planned?.has(store.id);
  const exchangeCode = getExchangeCode(origin);
  const isCX = exchangeCode !== undefined;

  const dockedStl =
    storagesStore
      .getByType('STL_FUEL_STORE')
      ?.filter(x => atSameLocation(x, origin) && isFree(x)) ?? [];

  const dockedFtl =
    storagesStore
      .getByType('FTL_FUEL_STORE')
      ?.filter(x => atSameLocation(x, origin) && isFree(x)) ?? [];

  if (dockedStl.length === 0 && dockedFtl.length === 0) {
    if (!planned) {
      log.info(t('act.refuel.noShips', originName));
    }
    return;
  }

  const totalStlRefuel = sumBy(dockedStl, x => calculateRefuelAmount(x, stlMaterial));
  const totalFtlRefuel = sumBy(dockedFtl, x => calculateRefuelAmount(x, ftlMaterial));

  if (totalFtlRefuel === 0 && totalStlRefuel === 0) {
    if (!planned) {
      log.info(t('act.refuel.noNeed', originName));
    }
    return;
  }

  let presentStlFuel =
    origin.items.find(x => x.quantity?.material.ticker === stlMaterial.ticker)?.quantity?.amount ??
    0;

  if (presentStlFuel < totalStlRefuel) {
    if (isCX && data.buyMissingFuel) {
      presentStlFuel += emitFuelPurchase(
        exchangeCode,
        stlMaterial.ticker,
        totalStlRefuel - presentStlFuel,
        emitStep,
      );
    }
    if (presentStlFuel < totalStlRefuel) {
      log.warning(t('act.refuel.notEnough', 'SF', originName));
    }
  }

  let presentFtlFuel =
    origin.items.find(x => x.quantity?.material.ticker === ftlMaterial.ticker)?.quantity?.amount ??
    0;

  if (presentFtlFuel < totalFtlRefuel) {
    if (isCX && data.buyMissingFuel) {
      presentFtlFuel += emitFuelPurchase(
        exchangeCode,
        ftlMaterial.ticker,
        totalFtlRefuel - presentFtlFuel,
        emitStep,
      );
    }
    if (presentFtlFuel < totalFtlRefuel) {
      log.warning(t('act.refuel.notEnough', 'FF', originName));
    }
  }

  for (const store of dockedStl) {
    const amount = clamp(calculateRefuelAmount(store, stlMaterial), 0, presentStlFuel);
    if (amount === 0) {
      continue;
    }
    emitStep(
      MTRA_TRANSFER({
        from: origin.id,
        to: store.id,
        ticker: stlMaterial.ticker,
        amount,
      }),
    );
    planned?.add(store.id);
    presentStlFuel -= amount;
  }

  for (const store of dockedFtl) {
    const amount = clamp(calculateRefuelAmount(store, ftlMaterial), 0, presentFtlFuel);
    if (amount === 0) {
      continue;
    }
    emitStep(
      MTRA_TRANSFER({
        from: origin.id,
        to: store.id,
        ticker: ftlMaterial.ticker,
        amount,
      }),
    );
    planned?.add(store.id);
    presentFtlFuel -= amount;
  }
}

// Return the fillable fuel amount for planning transfers. A short order book warns
// without stopping the run, so transfers must not assume the full request is filled.
function emitFuelPurchase(
  exchange: string,
  ticker: string,
  amount: number,
  emitStep: (step: ActionStep) => void,
) {
  const filled = fillAmount(`${ticker}.${exchange}`, amount, Number.POSITIVE_INFINITY);
  // Without order book data there is nothing better to assume than a full fill.
  const buyAmount = filled === undefined ? amount : filled.amount;
  if (buyAmount === 0) {
    return 0;
  }
  emitStep(
    CXPO_BUY({
      exchange,
      ticker,
      amount: buyAmount,
      priceLimit: Number.POSITIVE_INFINITY,
      allowUnfilled: false,
    }),
  );
  return buyAmount;
}

function getExchangeCode(store: PrunApi.Store) {
  const warehouse = warehousesStore.getById(store.addressableId);
  const originNaturalId = getEntityNaturalIdFromAddress(warehouse?.address);
  const exchange = exchangesStore.getByNaturalId(originNaturalId);
  return exchange?.code;
}

function calculateRefuelAmount(store: PrunApi.Store, material: PrunApi.Material) {
  // Fuel stores have the same volume/weight capacity ratio as the material,
  // so we can use either one.
  const freeVolume = store.volumeCapacity - store.volumeLoad;
  return Math.round(freeVolume / material.volume);
}

from tr import S, E, R
EX = 'src/features/XIT/ACT/ExecuteActionPackage.vue'
RF = 'src/features/XIT/ACT/actions/refuel/refuel.ts'
RU = 'src/features/XIT/ACT/actions/refuel/utils.ts'
RE = 'src/features/XIT/ACT/actions/refuel/Edit.vue'
FLT = 'src/features/XIT/FLT/FLT.vue'

S('新功能 —— 一键全部加油')
E('value.All Locations', 'All Locations', '所有地点')
E('act.refuel.allLocationsDesc', 'Refuel all docked ships from the storage at their location', '用各自所在地点的库存给所有停靠的船加油')

# Execute window: optional auto mode that starts at once and presses ACT for each step.
R(EX, '''const { pkg, afterExecute, extraSteps } = defineProps<{
  pkg: UserData.ActionPackageData;''', '''const { pkg, afterExecute, extraSteps, autoAct } = defineProps<{
  pkg: UserData.ActionPackageData;
  // Start at once and press ACT for every step without waiting for the player.
  autoAct?: boolean;''')
R(EX, '''function clearLog() {
  log.value.length = 0;
}''', '''function clearLog() {
  log.value.length = 0;
}

const autoActDelayMs = 300;

if (autoAct) {
  onMounted(() => {
    if (!shouldShowConfigure.value) {
      onExecuteClick();
    }
  });
  watch(actReady, ready => {
    if (!ready || !isRunning.value) {
      return;
    }
    setTimeout(() => {
      if (actReady.value) {
        onActClick();
      }
    }, autoActDelayMs);
  });
}''')

# A new origin: every storage where ships are docked.
R(RU, "export const allExchangesValue = 'All Exchanges';\n", "export const allExchangesValue = 'All Exchanges';\nexport const allLocationsValue = 'All Locations';\n")
R(RF, "import { allExchangesValue, getRefuelOrigins } from '@src/features/XIT/ACT/actions/refuel/utils';", "import {\n  allExchangesValue,\n  allLocationsValue,\n  getRefuelOrigins,\n} from '@src/features/XIT/ACT/actions/refuel/utils';")
R(RF, '''    if (action.origin === allExchangesValue) {
      return t('act.refuel.allDesc');
    }''', '''    if (action.origin === allExchangesValue) {
      return t('act.refuel.allDesc');
    }
    if (action.origin === allLocationsValue) {
      return t('act.refuel.allLocationsDesc');
    }''')
R(RF, '''      for (const origin of origins) {
        refuelFromOrigin(origin, data, stlMaterial, ftlMaterial, log, emitStep);
      }
      return;
    }''', '''      for (const origin of origins) {
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
    }''')
R(RF, '''  log: Logger,
  emitStep: (step: ActionStep) => void,
) {
  const originName = serializeStorage(origin);''', '''  log: Logger,
  emitStep: (step: ActionStep) => void,
  planned?: Set<string>,
) {
  const originName = serializeStorage(origin);
  const isFree = (store: PrunApi.Store) => !planned?.has(store.id);''')
R(RF, "storagesStore.getByType('STL_FUEL_STORE')?.filter(x => atSameLocation(x, origin)) ?? [];", "storagesStore\n      .getByType('STL_FUEL_STORE')\n      ?.filter(x => atSameLocation(x, origin) && isFree(x)) ?? [];")
R(RF, "storagesStore.getByType('FTL_FUEL_STORE')?.filter(x => atSameLocation(x, origin)) ?? [];", "storagesStore\n      .getByType('FTL_FUEL_STORE')\n      ?.filter(x => atSameLocation(x, origin) && isFree(x)) ?? [];")
# In "all locations" mode most storages have no ships; don't log a line for each of them.
R(RF, '''  if (dockedStl.length === 0 && dockedFtl.length === 0) {
    log.info(t('act.refuel.noShips', originName));
    return;
  }''', '''  if (dockedStl.length === 0 && dockedFtl.length === 0) {
    if (!planned) {
      log.info(t('act.refuel.noShips', originName));
    }
    return;
  }''')
R(RF, '''  if (totalFtlRefuel === 0 && totalStlRefuel === 0) {
    log.info(t('act.refuel.noNeed', originName));
    return;
  }''', '''  if (totalFtlRefuel === 0 && totalStlRefuel === 0) {
    if (!planned) {
      log.info(t('act.refuel.noNeed', originName));
    }
    return;
  }''')
R(RF, '''        ticker: stlMaterial.ticker,
        amount,
      }),
    );
    presentStlFuel -= amount;''', '''        ticker: stlMaterial.ticker,
        amount,
      }),
    );
    planned?.add(store.id);
    presentStlFuel -= amount;''')
R(RF, '''        ticker: ftlMaterial.ticker,
        amount,
      }),
    );
    presentFtlFuel -= amount;''', '''        ticker: ftlMaterial.ticker,
        amount,
      }),
    );
    planned?.add(store.id);
    presentFtlFuel -= amount;''')
R(RE, "import { allExchangesValue, getRefuelOrigins } from '@src/features/XIT/ACT/actions/refuel/utils';", "import {\n  allExchangesValue,\n  allLocationsValue,\n  getRefuelOrigins,\n} from '@src/features/XIT/ACT/actions/refuel/utils';")
R(RE, "  storages.unshift(allExchangesValue);\n", "  storages.unshift(allExchangesValue);\n  storages.unshift(allLocationsValue);\n")

R(FLT, "<FuelHeaderButton @refuel=\"showBuffer('XIT REFUELACT')\">", "<FuelHeaderButton @refuel=\"showBuffer('XIT REFUELACT AUTO')\">")
E('act.refuel.params', 'AUTO (all locations, no ACT clicks)', 'AUTO（所有地点，自动执行）')
R('src/features/XIT/ACT/actions/refuel/REFUELACT.ts', "  description: t('act.refuel.cmdDesc'),\n", "  description: t('act.refuel.cmdDesc'),\n  optionalParameters: t('act.refuel.params'),\n")

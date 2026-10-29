import { act } from '@src/features/XIT/ACT/act-registry';
import Edit from '@src/features/XIT/ACT/material-groups/resupply/Edit.vue';
import Configure from '@src/features/XIT/ACT/material-groups/resupply/Configure.vue';
import { Config } from '@src/features/XIT/ACT/material-groups/resupply/config';
import { sitesStore } from '@src/infrastructure/prun-api/data/sites';
import { workforcesStore } from '@src/infrastructure/prun-api/data/workforces';
import { productionStore } from '@src/infrastructure/prun-api/data/production';
import { configurableValue } from '@src/features/XIT/ACT/shared-types';
import {
  computeResupplyBill,
  getExcludedProduction,
} from '@src/features/XIT/ACT/material-groups/resupply/bill';
import { watchWhile } from '@src/utils/watch';
import {
  getEntityNameFromAddress,
  getEntityNaturalIdFromAddress,
} from '@src/infrastructure/prun-api/data/addresses';
import { t } from '@src/i18n';

act.addMaterialGroup<Config>({
  type: 'Resupply',
  shortDescription: t('act.resupply.short'),
  description: data => {
    if (!data.planet || data.days === undefined) {
      return '--';
    }

    const daysLabel = data.days === configurableValue ? '?' : data.days;
    return t(
      data.days == 1 ? 'act.resupply.desc1' : 'act.resupply.descN',
      data.planet,
      String(daysLabel),
    );
  },
  editComponent: Edit,
  configureComponent: Configure,
  needsConfigure: () => true,
  isValidConfig: (data, config) =>
    (data.planet !== configurableValue || config.planet !== undefined) &&
    (data.days !== configurableValue || config.days !== undefined),
  generateMaterialBill: async ({ data, config, log, setStatus }) => {
    if (!data.planet) {
      log.error(t('act.resupply.noPlanet'));
    }
    if (data.days === undefined) {
      log.error(t('act.resupply.noDays'));
    }

    const planet = data.planet === configurableValue ? config.planet : data.planet;
    const days =
      data.days === configurableValue
        ? (config.days ?? 10)
        : typeof data.days === 'number'
          ? data.days
          : parseFloat(data.days as string);
    const site = sitesStore.getByPlanetNaturalIdOrName(planet);
    if (!site) {
      log.error(t('act.resupply.noBase', data.planet ?? ''));
    }

    if (!site || days === undefined || isNaN(days)) {
      return undefined;
    }

    const workforce = computed(() => workforcesStore.getById(site?.siteId)?.workforces);
    const production = computed(() => productionStore.getBySiteId(site.siteId));
    if (workforce.value === undefined || production.value === undefined) {
      const name =
        getEntityNameFromAddress(site.address) ?? getEntityNaturalIdFromAddress(site.address);
      setStatus(t('act.resupply.loading', name ?? ''));
      await watchWhile(
        toRef(() => workforce.value === undefined || production.value === undefined),
      );
    }

    return computeResupplyBill(
      data,
      planet,
      days,
      config.materialFilter,
      getExcludedProduction(planet),
    );
  },
});

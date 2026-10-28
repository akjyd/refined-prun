import { act } from '@src/features/XIT/ACT/act-registry';
import Edit from '@src/features/XIT/ACT/material-groups/repair/Edit.vue';
import Configure from '@src/features/XIT/ACT/material-groups/repair/Configure.vue';
import { sitesStore } from '@src/infrastructure/prun-api/data/sites';
import { Config } from '@src/features/XIT/ACT/material-groups/repair/config';
import { configurableValue } from '@src/features/XIT/ACT/shared-types';
import { computeRepairBill } from '@src/features/XIT/ACT/material-groups/repair/bill';
import { t } from '@src/i18n';

act.addMaterialGroup<Config>({
  type: 'Repair',
  shortDescription: t('act.repair.short'),
  description: data => {
    if (!data.planet) {
      return '--';
    }

    const days = data.days;
    const daysLabel = days === configurableValue ? '?' : days;
    const daysPart =
      days !== undefined
        ? t(days == 1 ? 'act.repair.older1' : 'act.repair.olderN', String(daysLabel))
        : '';
    const advanceDays = data.advanceDays ?? 0;
    const advanceLabel = advanceDays === configurableValue ? '?' : advanceDays;
    return t(
      advanceDays == 1 ? 'act.repair.desc1' : 'act.repair.descN',
      data.planet,
      daysPart,
      String(advanceLabel),
    );
  },
  editComponent: Edit,
  configureComponent: Configure,
  needsConfigure: data =>
    data.planet === configurableValue ||
    data.days === configurableValue ||
    data.advanceDays === configurableValue,
  isValidConfig: (data, config) =>
    (data.planet !== configurableValue || config.planet !== undefined) &&
    (data.days !== configurableValue || config.days !== undefined) &&
    (data.advanceDays !== configurableValue || config.advanceDays !== undefined),
  generateMaterialBill: async ({ data, config, log }) => {
    if (!data.planet) {
      log.error(t('act.repair.noPlanet'));
      return undefined;
    }

    const planet = data.planet === configurableValue ? config.planet : data.planet;
    const site = sitesStore.getByPlanetNaturalIdOrName(planet);
    if (!site?.platforms) {
      log.error(t('act.repair.noData'));
      return undefined;
    }

    const rawDays = data.days === configurableValue ? config.days : data.days;
    const rawAdvanceDays =
      data.advanceDays === configurableValue ? config.advanceDays : data.advanceDays;
    const days = typeof rawDays === 'number' ? rawDays : parseFloat(rawDays!);
    let advanceDays =
      typeof rawAdvanceDays === 'number' ? rawAdvanceDays : parseFloat(rawAdvanceDays!);
    const threshold = isNaN(days) ? 0 : days;
    advanceDays = isNaN(advanceDays) ? 0 : advanceDays;

    return computeRepairBill(site, threshold, advanceDays);
  },
});

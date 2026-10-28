import { act } from '@src/features/XIT/ACT/act-registry';
import Edit from '@src/features/XIT/ACT/actions/govburn-data/Edit.vue';
import { OPEN_POPI } from '@src/features/XIT/ACT/action-steps/OPEN_POPI';
import { OPEN_POPID } from '@src/features/XIT/ACT/action-steps/OPEN_POPID';
import { OPEN_COGC } from '@src/features/XIT/ACT/action-steps/OPEN_COGC';
import { AssertFn } from '@src/features/XIT/ACT/shared-types';
import { planetsStore } from '@src/infrastructure/prun-api/data/planets';
import { popiBuildings } from '@src/core/popi-buildings';
import { t } from '@src/i18n';

act.addAction({
  type: 'GovBurn Data',
  shortDescription: t('act.gbd.short'),
  description: action => (action.planet ? t('act.gbd.desc', action.planet) : '--'),
  editComponent: Edit,
  generateSteps: async ctx => {
    const { data, emitStep } = ctx;
    const assert: AssertFn = ctx.assert;

    const planet = planetsStore.find(data.planet);
    assert(planet, t('act.gbd.noPlanet'));
    const naturalId = planet.naturalId;

    emitStep(OPEN_POPI({ planet: naturalId }));
    for (const entry of popiBuildings) {
      emitStep(OPEN_POPID({ planet: naturalId, ticker: entry.ticker }));
    }
    emitStep(OPEN_COGC({ planet: naturalId }));
  },
});

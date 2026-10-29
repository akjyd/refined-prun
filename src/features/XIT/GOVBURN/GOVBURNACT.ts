import '@src/features/XIT/ACT/actions/cx-buy/cx-buy';
import '@src/features/XIT/ACT/actions/mtra/mtra';

import GovBurnActWindow from '@src/features/XIT/GOVBURN/GovBurnActWindow.vue';
import { planetsStore } from '@src/infrastructure/prun-api/data/planets';
import { t } from '@src/i18n';

xit.add({
  command: 'GOVBURNACT',
  name: parameters => {
    // Support planet names with spaces.
    const parameter = parameters.join(' ');
    if (parameter) {
      const planet = planetsStore.find(parameter);
      return t('gov.act.titlePlanet', planet?.name ?? parameter);
    }
    return t('gov.act.title');
  },
  description: t('gov.act.description'),
  mandatoryParameters: t('gov.parameters'),
  component: () => GovBurnActWindow,
});

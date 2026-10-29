import '@src/features/XIT/ACT/actions/govburn-data/govburn-data';

import GovBurnDataWindow from '@src/features/XIT/GOVBURN/GovBurnDataWindow.vue';
import { planetsStore } from '@src/infrastructure/prun-api/data/planets';
import { t } from '@src/i18n';

xit.add({
  command: 'GOVBURNDATA',
  name: parameters => {
    // Support planet names with spaces.
    const parameter = parameters.join(' ');
    if (parameter) {
      const planet = planetsStore.find(parameter);
      return t('gov.data.titlePlanet', planet?.name ?? parameter);
    }
    return t('gov.data.title');
  },
  description: t('gov.data.description'),
  optionalParameters: t('gov.parameters'),
  component: () => GovBurnDataWindow,
});

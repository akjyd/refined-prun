import GovBurnOverview from '@src/features/XIT/GOVBURN/GovBurnOverview.vue';
import GovBurnPlanetView from '@src/features/XIT/GOVBURN/GovBurnPlanetView.vue';
import { planetsStore } from '@src/infrastructure/prun-api/data/planets';
import { t } from '@src/i18n';

xit.add({
  command: 'GOVBURN',
  name: parameters => {
    if (parameters.length === 0) {
      return t('gov.title');
    }
    // Support planet names with spaces.
    const parameter = parameters.join(' ');
    const planet = planetsStore.find(parameter);
    return t('gov.titlePlanet', planet?.name ?? parameter);
  },
  description: t('gov.description'),
  optionalParameters: t('gov.parameters'),
  component: params => (params.length > 0 ? GovBurnPlanetView : GovBurnOverview),
});

import BURN from '@src/features/XIT/BURN/BURN.vue';
import { sitesStore } from '@src/infrastructure/prun-api/data/sites';
import { getEntityNameFromAddress } from '@src/infrastructure/prun-api/data/addresses';
import { t } from '@src/i18n';

xit.add({
  command: 'BURN',
  name: parameters => {
    if (parameters[0] && !parameters[1]) {
      const site = sitesStore.getByPlanetNaturalIdOrName(parameters[0]);
      if (site) {
        const name = getEntityNameFromAddress(site.address);
        return `BURN - ${name}`;
      }
    }

    return 'BURN';
  },
  description: t('burn.description'),
  optionalParameters: t('burn.parameters'),
  component: () => BURN,
});

import PMMG from '@src/features/XIT/SET/PMMG.vue';
import SET from '@src/features/XIT/SET/SET.vue';
import { t } from '@src/i18n';

xit.add({
  command: ['SET', 'SETTINGS'],
  name: t('set.title'),
  description: t('set.description'),
  optionalParameters: t('set.parameters'),
  component: parameters => {
    switch (parameters[0]?.toUpperCase()) {
      case 'PMMG':
        return PMMG;
      default:
        return SET;
    }
  },
});

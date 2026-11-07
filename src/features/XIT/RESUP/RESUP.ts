import '@src/features/XIT/ACT/actions/mtra/mtra';

import RESUP from '@src/features/XIT/RESUP/RESUP.vue';
import { t } from '@src/i18n';

xit.add({
  command: 'RESUP',
  name: parameters => (parameters[0] ? `${t('resup.title')} - ${parameters[0]}` : t('resup.title')),
  description: t('resup.description'),
  mandatoryParameters: t('resup.parameters'),
  component: () => RESUP,
});

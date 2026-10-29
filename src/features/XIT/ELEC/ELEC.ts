import ELEC from '@src/features/XIT/ELEC/ELEC.vue';
import { t } from '@src/i18n';

xit.add({
  command: 'ELEC',
  name: t('elec.title'),
  description: t('elec.description'),
  component: () => ELEC,
});

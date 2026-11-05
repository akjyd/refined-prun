import MOVERS from '@src/features/XIT/MOVERS/MOVERS.vue';
import { t } from '@src/i18n';

xit.add({
  command: 'MOVERS',
  name: t('movers.title'),
  description: t('movers.description'),
  component: () => MOVERS,
});

import CX4 from '@src/features/XIT/CX4/CX4.vue';
import { t } from '@src/i18n';

xit.add({
  command: 'CX4',
  name: t('cx4.title'),
  description: t('cx4.description'),
  component: () => CX4,
});

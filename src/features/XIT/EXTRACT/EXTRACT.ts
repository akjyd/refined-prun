import EXTRACT from '@src/features/XIT/EXTRACT/EXTRACT.vue';
import { t } from '@src/i18n';

xit.add({
  command: 'EXTRACT',
  name: t('extract.title'),
  description: t('extract.description'),
  component: () => EXTRACT,
});

import CXDEL from '@src/features/XIT/CXDEL/CXDEL.vue';
import { t } from '@src/i18n';

xit.add({
  command: 'CXDEL',
  name: t('cxdel.title'),
  description: t('cxdel.description'),
  component: () => CXDEL,
});

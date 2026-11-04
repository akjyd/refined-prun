import ORDERS from '@src/features/XIT/ORDERS/ORDERS.vue';
import { t } from '@src/i18n';

xit.add({
  command: 'ORDERS',
  name: t('orders.title'),
  description: t('orders.description'),
  component: () => ORDERS,
});

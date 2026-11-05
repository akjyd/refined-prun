import ARB from '@src/features/XIT/ARB/ARB.vue';
import { t } from '@src/i18n';

xit.add({
  command: 'ARB',
  name: t('arb.title'),
  description: t('arb.description'),
  component: () => ARB,
});

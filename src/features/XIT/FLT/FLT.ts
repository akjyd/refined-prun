import FLT from './FLT.vue';
import { t } from '@src/i18n';

xit.add({
  command: ['FLT', 'FLEET'],
  name: 'FLEET',
  description: t('flt.description'),
  component: () => FLT,
  bufferSize: [500, 300],
});

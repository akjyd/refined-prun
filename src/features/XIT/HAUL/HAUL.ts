import HAUL from '@src/features/XIT/HAUL/HAUL.vue';
import { t } from '@src/i18n';

xit.add({
  command: ['HAUL', 'HAULS'],
  name: t('haul.title'),
  description: t('haul.description'),
  contextItems: () => [{ cmd: 'XIT CONTS' }, { cmd: 'XIT LOAN' }],
  component: () => HAUL,
});

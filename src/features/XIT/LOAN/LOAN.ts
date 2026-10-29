import LOAN from '@src/features/XIT/LOAN/LOAN.vue';
import { t } from '@src/i18n';

xit.add({
  command: ['LOAN', 'LOANS'],
  name: t('loan.title'),
  description: t('loan.description'),
  contextItems: () => [{ cmd: 'XIT CONTS' }, { cmd: 'XIT HAUL' }],
  component: () => LOAN,
});

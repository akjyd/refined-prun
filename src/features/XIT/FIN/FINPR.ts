import FINPR from '@src/features/XIT/FIN/FINPR.vue';
import { t } from '@src/i18n';

xit.add({
  command: ['FINPR'],
  name: t('finpr.title'),
  description: t('finpr.description'),
  contextItems: () => [
    { cmd: 'XIT FIN' },
    { cmd: 'XIT FINBS' },
    { cmd: 'XIT FINCH' },
    { cmd: 'XIT SET FIN' },
  ],
  component: () => FINPR,
});

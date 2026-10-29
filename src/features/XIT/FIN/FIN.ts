import FIN from '@src/features/XIT/FIN/FIN.vue';
import { t } from '@src/i18n';

xit.add({
  command: ['FIN'],
  name: t('fin.title'),
  description: t('fin.description'),
  contextItems: () => [
    { cmd: 'XIT FINBS' },
    { cmd: 'XIT FINPR' },
    { cmd: 'XIT FINCH' },
    { cmd: 'XIT SET FIN' },
  ],
  component: () => FIN,
});

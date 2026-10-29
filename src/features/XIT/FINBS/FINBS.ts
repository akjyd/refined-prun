import FINBS from '@src/features/XIT/FINBS/FINBS.vue';
import { t } from '@src/i18n';

xit.add({
  command: ['FINBS'],
  name: t('finbs.title'),
  description: t('finbs.description'),
  contextItems: () => [
    { cmd: 'XIT FIN' },
    { cmd: 'XIT FINPR' },
    { cmd: 'XIT FINCH' },
    { cmd: 'XIT SET FIN' },
  ],
  component: () => FINBS,
});

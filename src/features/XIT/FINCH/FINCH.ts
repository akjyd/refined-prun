import FINCH from '@src/features/XIT/FINCH/FINCH.vue';
import { t } from '@src/i18n';

xit.add({
  command: ['FINCH'],
  name: t('finch.title'),
  description: t('finch.description'),
  optionalParameters: t('finch.param'),
  contextItems: () => [
    { cmd: 'XIT FIN' },
    { cmd: 'XIT FINBS' },
    { cmd: 'XIT FINPR' },
    { cmd: 'XIT SET FIN' },
  ],
  component: () => FINCH,
});

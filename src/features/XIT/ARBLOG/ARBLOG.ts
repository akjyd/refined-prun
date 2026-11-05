import ARBLOG from '@src/features/XIT/ARBLOG/ARBLOG.vue';
import { t } from '@src/i18n';

xit.add({
  command: 'ARBLOG',
  name: t('arblog.title'),
  description: t('arblog.description'),
  component: () => ARBLOG,
});

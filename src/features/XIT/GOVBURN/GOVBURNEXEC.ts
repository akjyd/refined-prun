import '@src/features/XIT/ACT/actions/cx-buy/cx-buy';
import '@src/features/XIT/ACT/actions/mtra/mtra';

import GovBurnExecWindow from '@src/features/XIT/GOVBURN/GovBurnExecWindow.vue';
import { t } from '@src/i18n';

xit.add({
  command: 'GOVBURNEXEC',
  hidden: true,
  name: t('gov.exec.title'),
  description: t('gov.exec.description'),
  component: () => GovBurnExecWindow,
});

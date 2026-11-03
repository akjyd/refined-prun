import '@src/features/XIT/ACT/actions/govburn-maintain/govburn-maintain';

import GovBurnMaintainWindow from '@src/features/XIT/GOVBURN/GovBurnMaintainWindow.vue';
import { t } from '@src/i18n';

xit.add({
  command: 'GOVBURNMAINT',
  name: t('gov.maint.title'),
  description: t('gov.maint.description'),
  optionalParameters: t('gov.maint.params'),
  component: () => GovBurnMaintainWindow,
});

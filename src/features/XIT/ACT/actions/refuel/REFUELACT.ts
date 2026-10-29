import '@src/features/XIT/ACT/actions/refuel/refuel';

import RefuelActWindow from '@src/features/XIT/ACT/actions/refuel/RefuelActWindow.vue';
import { t } from '@src/i18n';

xit.add({
  command: 'REFUELACT',
  name: t('act.refuel.title'),
  description: t('act.refuel.cmdDesc'),
  optionalParameters: t('act.refuel.params'),
  component: () => RefuelActWindow,
});

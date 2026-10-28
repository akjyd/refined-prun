import './actions/cont-ship/cont-ship';
import './actions/cont-trade/cont-trade';
import './actions/cx-buy/cx-buy';
import './actions/mtra/mtra';
import './actions/refuel/refuel';

import './material-groups/manual/manual';
import './material-groups/paste/paste';
import './material-groups/repair/repair';
import './material-groups/resupply/resupply';

import ACT from '@src/features/XIT/ACT/ACT.vue';
import { t } from '@src/i18n';

xit.add({
  command: ['ACT', 'ACTION'],
  name: parameters => {
    if (parameters.length === 0) {
      return t('act.title.list');
    }
    if (parameters[0].toUpperCase() == 'GEN' || parameters[0].toUpperCase() == 'EDIT') {
      return t('act.title.edit');
    }
    return t('act.title.execute');
  },
  description: t('act.description'),
  optionalParameters: t('act.parameters'),
  contextItems: parameters => (parameters.length > 0 ? [{ cmd: 'XIT ACT' }] : []),
  component: () => ACT,
});

import { act } from '@src/features/XIT/ACT/act-registry';
import { fixed0 } from '@src/utils/format';
import Edit from '@src/features/XIT/ACT/material-groups/manual/Edit.vue';

import { materialBillFromQuantities } from '@src/features/XIT/ACT/material-bill';
import { t } from '@src/i18n';

act.addMaterialGroup({
  type: 'Manual',
  shortDescription: t('act.manual.short'),
  description: data => {
    const materials = data.materials;
    if (!materials || Object.keys(materials).length == 0) {
      return '--';
    }

    return Object.keys(materials)
      .map(ticker => `${fixed0(materials[ticker])} ${ticker}`)
      .join(', ');
  },
  editComponent: Edit,
  generateMaterialBill: async ({ data, log }) => {
    if (!data.materials || Object.keys(data.materials).length == 0) {
      log.error(t('act.manual.missing'));
      return undefined;
    }
    return materialBillFromQuantities(data.materials);
  },
});

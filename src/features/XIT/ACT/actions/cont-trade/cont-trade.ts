import { act } from '@src/features/XIT/ACT/act-registry';
import Edit from '@src/features/XIT/ACT/actions/cont-trade/Edit.vue';
import Configure from '@src/features/XIT/ACT/actions/cont-trade/Configure.vue';
import { CONT_TRADE } from '@src/features/XIT/ACT/action-steps/CONT_TRADE';
import { Config } from '@src/features/XIT/ACT/actions/cont-trade/config';
import { AssertFn, configurableValue } from '@src/features/XIT/ACT/shared-types';
import {
  displayLocationValue,
  resolveLocation,
} from '@src/features/XIT/ACT/actions/cont-locations';
import {
  isValidContractPrice,
  maxContractPrice,
  minContractPrice,
} from '@src/features/XIT/ACT/actions/cont-limits';
import { t } from '@src/i18n';

act.addAction<Config>({
  type: 'CONT Trade',
  shortDescription: t('act.ctrade.short'),
  description: (action, config) => {
    if (!action.group || !action.contLocation) {
      return '--';
    }

    const tradeLabel = action.contTradeType === 'SELLING' ? t('act.cont.sell') : t('act.cont.buy');
    const location =
      action.contLocation === configurableValue
        ? (config?.location ?? t('act.f.configuredLocation'))
        : displayLocationValue(action.contLocation);

    return t('act.ctrade.desc', tradeLabel, action.group, location);
  },
  editComponent: Edit,
  configureComponent: Configure,
  needsConfigure: data => {
    return data.contLocation === configurableValue;
  },
  isValidConfig: (data, config) => {
    return data.contLocation !== configurableValue || config.location !== undefined;
  },
  generateSteps: async ctx => {
    const { data, config, packageName, getMaterialGroup, getMaterialGroupPlanet, emitStep } = ctx;
    const assert: AssertFn = ctx.assert;

    const materials = await getMaterialGroup(data.group);
    assert(materials, t('act.f.invalidGroup'));

    const traded = Object.values(materials).filter(x => x.quantity > 0);
    assert(traded.length > 0, t('act.ctrade.noMaterials'));

    // Reject missing prices before editing a draft; a blank price creates a free trade.
    assert(
      traded.every(x => isValidContractPrice(x.price)),
      t('act.ctrade.needPrice', data.group, minContractPrice, maxContractPrice),
    );

    const location = resolveLocation(data.contLocation, config?.location, getMaterialGroupPlanet);
    assert(location, t('act.f.invalidLocation'));

    const tradeType = data.contTradeType ?? 'BUYING';
    const daysToFulfill = data.daysToFulfill ?? 3;
    const currency = data.currency ?? 'AIC';

    emitStep(
      CONT_TRADE({
        packageName,
        materials,
        tradeType,
        location,
        currency,
        daysToFulfill,
      }),
    );
  },
});

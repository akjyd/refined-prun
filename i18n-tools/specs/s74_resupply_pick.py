from tr import S, E, R
RS = 'src/features/XIT/ACT/material-groups/resupply/resupply.ts'
CF = 'src/features/XIT/ACT/material-groups/resupply/Configure.vue'

S('新功能 —— 补给时勾选生产原料')
E('act.resupply.pick', 'Production materials', '生产原料')
E('act.resupply.pickTip', 'Untick the production materials that you do not want to resupply. Consumables are always included. The selection is remembered for each planet.', '取消勾选不想补给的生产原料。消耗品总是会补给。每个星球的选择会被记住。')
E('act.resupply.pickNone', 'No production materials', '没有生产原料')

# Always show the configure step, so the player can pick materials before each run.
R(RS, "  needsConfigure: data => data.planet === configurableValue || data.days === configurableValue,", "  needsConfigure: () => true,")
R(RS, "import { computeResupplyBill } from '@src/features/XIT/ACT/material-groups/resupply/bill';", """import {
  computeResupplyBill,
  getExcludedProduction,
} from '@src/features/XIT/ACT/material-groups/resupply/bill';""")
R(RS, "    return computeResupplyBill(data, planet, days, config.materialFilter);", """    return computeResupplyBill(
      data,
      planet,
      days,
      config.materialFilter,
      getExcludedProduction(planet),
    );""")

R(CF, "import { computeResupplyBill } from '@src/features/XIT/ACT/material-groups/resupply/bill';", """import {
  computeResupplyBill,
  getExcludedProduction,
  getProductionOnlyTickers,
  setExcludedProduction,
} from '@src/features/XIT/ACT/material-groups/resupply/bill';
import RadioItem from '@src/components/forms/RadioItem.vue';""")
R(CF, """const bill = computed(() =>
  computeResupplyBill(data, effectivePlanet.value, effectiveDays.value, materialFilter.value),
);""", """const productionTickers = computed(() => getProductionOnlyTickers(effectivePlanet.value));
const excluded = computed(() => getExcludedProduction(effectivePlanet.value));

function isPicked(ticker: string) {
  return !excluded.value.includes(ticker);
}

function setPicked(ticker: string, picked: boolean) {
  const rest = excluded.value.filter(x => x !== ticker);
  setExcludedProduction(effectivePlanet.value, picked ? rest : [...rest, ticker]);
}

const bill = computed(() =>
  computeResupplyBill(
    data,
    effectivePlanet.value,
    effectiveDays.value,
    materialFilter.value,
    excluded.value,
  ),
);""")
R(CF, "    const entries = computeResupplyBill(data, planet, days, materialFilter.value)!;", "    const entries = computeResupplyBill(data, planet, days, materialFilter.value, excluded.value)!;")
R(CF, """    <SelectInput v-model="materialFilter" :options="tOptions(materialFilterOptions)" />
  </Active>""", """    <SelectInput v-model="materialFilter" :options="tOptions(materialFilterOptions)" />
  </Active>
  <Active
    v-if="materialFilter !== 'Workforce'"
    :label="t('act.resupply.pick')"
    :tooltip="t('act.resupply.pickTip')">
    <div v-if="productionTickers.length > 0" :class="$style.pick">
      <RadioItem
        v-for="ticker in productionTickers"
        :key="ticker"
        :model-value="isPicked(ticker)"
        horizontal
        @update:model-value="v => setPicked(ticker, v)">
        {{ ticker }}
      </RadioItem>
    </div>
    <span v-else>{{ t('act.resupply.pickNone') }}</span>
  </Active>""")
R(CF, """.totals {
  margin: 4px 4px 4px 8px;
}""", """.totals {
  margin: 4px 4px 4px 8px;
}

.pick {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}""")

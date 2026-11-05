from tr import S, E, R
RS = 'src/features/XIT/ACT/material-groups/resupply/resupply.ts'
CF = 'src/features/XIT/ACT/material-groups/resupply/Configure.vue'
CB = 'src/features/XIT/ACT/actions/cx-buy/cx-buy.ts'

S('新功能 —— 补给原料：仓库有就带走、不买')
E('act.resupply.modeBuy', 'buy', '买')
E('act.resupply.modeWarehouse', 'warehouse', '仓库')
E('act.resupply.modeNone', 'skip', '不带')
E('act.resupply.pickTip2', 'Click a material to switch: buy = take from the CX warehouse and buy the rest; warehouse = take only what the CX warehouse has; skip = leave it out. Consumables are always bought. The choice is remembered for each planet.', '点物资切换：买 = 先用交易所仓库的，不够的买；仓库 = 只带走交易所仓库里有的，不买；不带 = 不补这种原料。工人消耗品总是会买。每个星球分别记住。')

R(RS, """  getExcludedProduction,
} from '@src/features/XIT/ACT/material-groups/resupply/bill';""", """  getExcludedProduction,
  getWarehouseOnly,
} from '@src/features/XIT/ACT/material-groups/resupply/bill';""")
R(RS, """      getExcludedProduction(planet),
    );""", """      getExcludedProduction(planet),
      getWarehouseOnly(planet),
    );""")

R(CF, """  setExcludedProduction,
} from '@src/features/XIT/ACT/material-groups/resupply/bill';""", """  setExcludedProduction,
  getWarehouseOnly,
  setWarehouseOnly,
} from '@src/features/XIT/ACT/material-groups/resupply/bill';""")
R(CF, """function isPicked(ticker: string) {
  return !excluded.value.includes(ticker);
}

function setPicked(ticker: string, picked: boolean) {
  const rest = excluded.value.filter(x => x !== ticker);
  setExcludedProduction(effectivePlanet.value, picked ? rest : [...rest, ticker]);
}""", """const warehouseOnly = computed(() => getWarehouseOnly(effectivePlanet.value));

// Click order: buy, warehouse, skip, then buy again.
function modeOf(ticker: string) {
  if (excluded.value.includes(ticker)) {
    return 'none';
  }
  return warehouseOnly.value.includes(ticker) ? 'warehouse' : 'buy';
}

function nextMode(ticker: string) {
  const mode = modeOf(ticker);
  const planet = effectivePlanet.value;
  const notExcluded = excluded.value.filter(x => x !== ticker);
  const notWarehouse = warehouseOnly.value.filter(x => x !== ticker);
  if (mode === 'buy') {
    setWarehouseOnly(planet, [...notWarehouse, ticker]);
  } else if (mode === 'warehouse') {
    setWarehouseOnly(planet, notWarehouse);
    setExcludedProduction(planet, [...notExcluded, ticker]);
  } else {
    setExcludedProduction(planet, notExcluded);
  }
}

const modeLabel = {
  buy: t('act.resupply.modeBuy'),
  warehouse: t('act.resupply.modeWarehouse'),
  none: t('act.resupply.modeNone'),
};""")
R(CF, """    materialFilter.value,
    excluded.value,
  ),
);""", """    materialFilter.value,
    excluded.value,
    warehouseOnly.value,
  ),
);""")
R(CF, """:tooltip="t('act.resupply.pickTip')">""", """:tooltip="t('act.resupply.pickTip2')">""")
R(CF, """      <RadioItem
        v-for="ticker in productionTickers"
        :key="ticker"
        :model-value="isPicked(ticker)"
        horizontal
        @update:model-value="v => setPicked(ticker, v)">
        {{ ticker }}
      </RadioItem>""", """      <PrunButton
        v-for="ticker in productionTickers"
        :key="ticker"
        dark
        inline
        :class="$style[`mode_${modeOf(ticker)}`]"
        @click="nextMode(ticker)">
        {{ ticker }} · {{ modeLabel[modeOf(ticker)] }}
      </PrunButton>""")
R(CF, """.pick {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}""", """.pick {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.mode_warehouse {
  color: #f7a600;
}

.mode_none {
  opacity: 0.45;
  text-decoration: line-through;
}""")

R(CB, """    for (const ticker of Object.keys(materials)) {
      if (noBuy.has(ticker)) {
        continue;
      }""", """    for (const ticker of Object.keys(materials)) {
      // Warehouse-only materials: the CX warehouse part was taken above; do not buy the rest.
      if (noBuy.has(ticker) || materials[ticker].warehouseOnly === true) {
        continue;
      }""")
R(CF, """import RadioItem from '@src/components/forms/RadioItem.vue';
""", "")

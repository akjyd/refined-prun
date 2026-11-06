from tr import S, E, R

S('ACT 配置：交易所只填一次')

R('src/features/XIT/ACT/actions/cx-buy/Configure.vue',
  "import { Config } from '@src/features/XIT/ACT/actions/cx-buy/config';\n",
  "import { Config } from '@src/features/XIT/ACT/actions/cx-buy/config';\nimport { linkExchange } from '@src/features/XIT/ACT/shared-exchange';\n")
R('src/features/XIT/ACT/actions/cx-buy/Configure.vue',
  "config.exchange ??= exchanges[0];\n",
  "config.exchange ??= exchanges[0];\n\n// One exchange for the whole configure window: follow the others, pass a change on.\nlinkExchange(\n  () => config.exchange,\n  value => (config.exchange = value),\n  exchanges,\n);\n")

R('src/features/XIT/ACT/actions/mtra/Configure.vue',
  "import { configurableValue } from '@src/features/XIT/ACT/shared-types';\n",
  "import { configurableValue } from '@src/features/XIT/ACT/shared-types';\nimport { cxWarehouseName, sharedExchange } from '@src/features/XIT/ACT/shared-exchange';\n")
R('src/features/XIT/ACT/actions/mtra/Configure.vue',
  "// Autofill and autofix selections on storage list change.\n",
  "// The origin follows the exchange chosen in this configure window: your warehouse there.\nwatch(\n  sharedExchange,\n  code => {\n    if (data.origin !== configurableValue || code === undefined) {\n      return;\n    }\n    const name = cxWarehouseName(code);\n    if (name !== undefined && originStorages.value.some(x => serializeStorage(x) === name)) {\n      config.origin = name;\n    }\n  },\n  { immediate: true },\n);\n\n// Autofill and autofix selections on storage list change.\n")

R('src/features/XIT/ACT/material-groups/resupply/Configure.vue',
  "const warehouseStock = computed(() => cxWarehouseStock(warehouseExchange.value));\n",
  "const warehouseStock = computed(() => cxWarehouseStock(warehouseExchange.value));\n// The warehouse exchange is the exchange for the whole window (CX Buy, MTRA origin).\nsharedExchange.value = warehouseExchange.value;\nlinkExchange(\n  () => warehouseExchange.value,\n  value => (warehouseExchange.value = value),\n  exchanges,\n);\n")
R('src/features/XIT/ACT/material-groups/resupply/Configure.vue',
  "import { maxFittingDays } from '@src/features/XIT/ACT/material-groups/resupply/fit-days';\n",
  "import { maxFittingDays } from '@src/features/XIT/ACT/material-groups/resupply/fit-days';\nimport { linkExchange, sharedExchange } from '@src/features/XIT/ACT/shared-exchange';\n")

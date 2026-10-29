from tr import S, E, R
A = 'src/features/XIT/ACT/actions/'
G = 'src/features/XIT/ACT/material-groups/'

def label(f, en, key, n=1):
    R(f, f'label="{en}"', f":label=\"t('{key}')\"", n)

S('特殊值（存进动作包的值不变，只换显示）')
E('value.Configure on Execution', 'Configure on Execution', '执行时再选')
E('value.CX Buy Only', 'CX Buy Only', '只在交易所购买（不转运）')
E('value.All Exchanges', 'All Exchanges', '所有交易所')
E('value.All', 'All', '全部')
E('value.Workforce', 'Workforce', '只算工人消耗品')
E('value.Production', 'Production', '只算生产原料')
E('value.Buy', 'Buy', '购买')
E('value.Sell', 'Sell', '出售')

S('XIT ACT —— 动作表单通用')
E('act.f.group', 'Material Group', '物资组')
E('act.f.exchange', 'Exchange', '交易所')
E('act.f.origin', 'Origin', '起点')
E('act.f.destination', 'Destination', '终点')
E('act.f.from', 'From', '从')
E('act.f.to', 'To', '到')
E('act.f.location', 'Location', '地点')
E('act.f.currency', 'Currency', '货币')
E('act.f.daysToFulfill', 'Days to Fulfill', '完成期限（天）')
E('act.f.planet', 'Planet', '星球')
E('act.f.noLocations', 'No locations available', '没有可选的地点')
E('act.f.configuredLocation', 'configured location', '执行时选定的地点')
E('act.f.configuredExchange', 'configured exchange', '执行时选定的交易所')
E('act.f.groupTarget', '[{0}] target', '[{0}] 的目标星球')
E('act.f.invalidGroup', 'Invalid material group', '物资组无效')
E('act.f.invalidOrigin', 'Invalid origin', '起点无效')
E('act.f.invalidDest', 'Invalid destination', '终点无效')
E('act.f.invalidLocation', 'Invalid location', '地点无效')
E('act.f.close', 'CLOSE', '关闭')
E('act.f.edit', 'EDIT', '编辑')
E('act.f.tickerN', 'Material Ticker #{0}', '物资代码 #{0}')

S('XIT ACT —— 交易所购买（CX Buy）')
f = A+'cx-buy/cx-buy.ts'
E('act.cxbuy.short', 'Buy materials from a commodity exchange', '从商品交易所购买物资')
R(f, "shortDescription: 'Buy materials from a commodity exchange',", "shortDescription: t('act.cxbuy.short'),")
R(f, "? (config?.exchange ?? 'configured exchange')", "? (config?.exchange ?? t('act.f.configuredExchange'))")
E('act.cxbuy.desc', 'Buying group {0} from {1}', '从 {1} 购买物资组 {0}')
R(f, "return 'Buying group ' + action.group + ' from ' + exchange;", "return t('act.cxbuy.desc', action.group, exchange);")
R(f, "assert(materials, 'Invalid material group');", "assert(materials, t('act.f.invalidGroup'));")
E('act.cxbuy.noExchange', 'Missing exchange', '缺少交易所')
R(f, "assert(exchange, 'Missing exchange');", "assert(exchange, t('act.cxbuy.noExchange'));")
E('act.cxbuy.nanLimit', 'Non-numerical price limit on {0}', '{0} 的限价不是数字')
R(f, "log.error('Non-numerical price limit on ' + ticker);", "log.error(t('act.cxbuy.nanLimit', ticker));")
R(f, '''          `${fixed0(leftover)} ${ticker} will not be bought on ${exchange} ` +
          `(${fixed0(filled.amount)} of ${fixed0(amount)} available`;''', '''          t(
            'act.cxpo.shortage',
            fixed0(leftover),
            ticker,
            exchange,
            fixed0(filled.amount),
            fixed0(amount),
          );''')
R(f, 'message += ` with price limit ${fixed02(priceLimit)}/u`;', "message += t('act.cxpo.shortageLimit', fixed02(priceLimit));")
R(f, "message += ')';", "message += t('act.common.closeParen');")
f = A+'cx-buy/Edit.vue'
label(f, 'Material Group', 'act.f.group'); label(f, 'Exchange', 'act.f.exchange')
R(f, ':options="exchanges"', ':options="tOptions(exchanges)"')
E('act.cxbuy.priceLimits', 'Price Limits', '限价')
R(f, '<Commands label="Price Limits">', "<Commands :label=\"t('act.cxbuy.priceLimits')\">")
R(f, '@click="onEditPriceLimitsClick">EDIT</PrunButton>', "@click=\"onEditPriceLimitsClick\">{{ t('act.f.edit') }}</PrunButton>")
for key, en, zh, tip_en, tip_zh, model, toggle_en in [
    ('buyPartial', 'Buy Partial', '只买够得着的', 'Limit the purchase quantity to the stock available within your price limit when the package starts.', '把购买数量限制在动作包开始时、限价以内能买到的库存。', 'buyPartial', 'buy partial'),
    ('allowUnfilled', 'Allow Unfilled', '允许挂单', 'Create a full bid order even if there is not enough stock on the CX.', '交易所库存不够时，也按全部数量挂出求购单。', 'allowUnfilled', 'allow unfilled'),
    ('useCXInv', 'Use CX Inventory', '计入交易所库存', 'Whether to use stock in the CX warehouse when calculating how much needs to be bought.', '计算要买多少时，是否扣除交易所仓库里已有的库存。', 'useCXInv', 'use cx inventory'),
]:
    E(f'act.cxbuy.{key}', en, zh); E(f'act.cxbuy.{key}Tip', tip_en, tip_zh); E(f'act.cxbuy.{key}Toggle', toggle_en, zh)
    R(f, f'''    label="{en}"
    tooltip="{tip_en}">
    <RadioItem v-model="{model}">{toggle_en}</RadioItem>''', f'''    :label="t('act.cxbuy.{key}')"
    :tooltip="t('act.cxbuy.{key}Tip')">
    <RadioItem v-model="{model}">{{{{ t('act.cxbuy.{key}Toggle') }}}}</RadioItem>''')
f = A+'cx-buy/Configure.vue'
E('act.cxbuy.skip', 'Skip CX Buy', '跳过交易所购买')
E('act.cxbuy.skipTip', 'Whether to skip purchasing materials and only perform the transfer.', '是否不买东西，只做转运。')
E('act.cxbuy.skipToggle', 'skip cx buy', '跳过购买')
R(f, '''      label="Skip CX Buy"
      tooltip="Whether to skip purchasing materials and only perform the transfer.">
      <RadioItem v-model="config.skip">skip cx buy</RadioItem>''', '''      :label="t('act.cxbuy.skip')"
      :tooltip="t('act.cxbuy.skipTip')">
      <RadioItem v-model="config.skip">{{ t('act.cxbuy.skipToggle') }}</RadioItem>''')
R(f, '<Active v-if="!config.skip" label="Exchange">', "<Active v-if=\"!config.skip\" :label=\"t('act.f.exchange')\">")
R(f, ':options="exchanges"', ':options="tOptions(exchanges)"')
f = A+'cx-buy/EditPriceLimits.vue'
E('act.cxbuy.editLimits', 'Edit Price Limits', '编辑限价')
E('act.cxbuy.limitN', 'Price Limit #{0}', '限价 #{0}')
R(f, '<SectionHeader>Edit Price Limits</SectionHeader>', "<SectionHeader>{{ t('act.cxbuy.editLimits') }}</SectionHeader>")
R(f, ':label="`Material Ticker #${i + 1}`"', ":label=\"t('act.f.tickerN', i + 1)\"")
R(f, ':label="`Price Limit #${i + 1}`"', ":label=\"t('act.cxbuy.limitN', i + 1)\"")
R(f, '@click="onAddClick">ADD</PrunButton>', "@click=\"onAddClick\">{{ t('act.common.add') }}</PrunButton>")
R(f, '''@click="emit('close')">CLOSE</PrunButton>''', '''@click="emit('close')">{{ t('act.f.close') }}</PrunButton>''')

S('XIT ACT —— 物资转运（MTRA）')
f = A+'mtra/mtra.ts'
E('act.mtrab.short', 'Transfer materials between storages at the same location', '在同一地点的两个库存之间转运物资')
R(f, "shortDescription: 'Transfer materials between storages at the same location',", "shortDescription: t('act.mtrab.short'),")
R(f, "? (config?.origin ?? 'configured location')", "? (config?.origin ?? t('act.f.configuredLocation'))")
R(f, "? (config?.destination ?? 'configured location')", "? (config?.destination ?? t('act.f.configuredLocation'))")
E('act.mtrab.cxOnly', 'CX Buy only [{0}] from {1} (no transfer)', '只从 {1} 购买 [{0}]（不转运）')
E('act.mtrab.desc', 'Transfer group [{0}] from {1} to {2}', '把物资组 [{0}] 从 {1} 转运到 {2}')
R(f, 'return `CX Buy only [${action.group}] from ${origin} (no transfer)`;', "return t('act.mtrab.cxOnly', action.group, tValue(origin));")
R(f, 'return `Transfer group [${action.group}] from ${origin} to ${dest}`;', "return t('act.mtrab.desc', action.group, origin, dest);")
R(f, "assert(maybeMaterials, 'Invalid material group');", "assert(maybeMaterials, t('act.f.invalidGroup'));")
R(f, "assert(maybeOrigin, 'Invalid origin');", "assert(maybeOrigin, t('act.f.invalidOrigin'));")
R(f, "assert(maybeDest, 'Invalid destination');", "assert(maybeDest, t('act.f.invalidDest'));")
E('act.mtrab.notSame', 'Origin and destination are not at the same location', '起点和终点不在同一个地点')
R(f, "assert(isSameLocation, 'Origin and destination are not at the same location');", "assert(isSameLocation, t('act.mtrab.notSame'));")
E('act.mtrab.viaShpi', 'Group covers the entire cargo hold - unloading via SHPI instead of MTRA', '物资组包含了整个货舱的货物，改用 SHPI 整舱卸货，不用 MTRA')
R(f, "log.info('Group covers the entire cargo hold - unloading via SHPI instead of MTRA');", "log.info(t('act.mtrab.viaShpi'));")
E('act.mtrab.skipOffload', 'Skipping offload for missing material group [{0}]', '物资组 [{0}] 不存在，跳过卸货')
R(f, 'log.warning(`Skipping offload for missing material group [${name}]`);', "log.warning(t('act.mtrab.skipOffload', name));")
f = A+'mtra/Edit.vue'
label(f, 'Material Group', 'act.f.group'); label(f, 'Origin', 'act.f.origin'); label(f, 'Destination', 'act.f.destination')
R(f, ':options="storages"', ':options="tOptions(storages)"', 2)
f = A+'mtra/Configure.vue'
R(f, 'label="From"', ":label=\"t('act.f.from')\"", 2)
R(f, 'label="To"', ":label=\"t('act.f.to')\"", 2)
R(f, "options.push({ label: CX_BUY_ONLY_DEST, value: CX_BUY_ONLY_DEST });", "options.push({ label: tValue(CX_BUY_ONLY_DEST), value: CX_BUY_ONLY_DEST });")
R(f, "options.push({ label: 'No locations available', value: undefined! });", "options.push({ label: t('act.f.noLocations'), value: undefined! });")

S('XIT ACT —— 加油（Refuel）')
f = A+'refuel/refuel.ts'
E('act.refuel.short', 'Refuel all ships docked near a storage', '给停在某个库存附近的所有船加油')
R(f, "shortDescription: 'Refuel all ships docked near a storage',", "shortDescription: t('act.refuel.short'),")
E('act.refuel.allDesc', 'Refuel all ships docked at exchanges', '给停在各交易所的所有船加油')
R(f, "return 'Refuel all ships docked at exchanges';", "return t('act.refuel.allDesc');")
E('act.refuel.nearDesc', 'Refuel all ships near {0}', '给 {0} 附近的所有船加油')
R(f, "return action.origin ? 'Refuel all ships near ' + action.origin : '--';", "return action.origin ? t('act.refuel.nearDesc', action.origin) : '--';")
E('act.refuel.noSF', 'SF material not found', '找不到物资 SF')
E('act.refuel.noFF', 'FF material not found', '找不到物资 FF')
R(f, "assert(stlMaterial, 'SF material not found');", "assert(stlMaterial, t('act.refuel.noSF'));")
R(f, "assert(ftlMaterial, 'FF material not found');", "assert(ftlMaterial, t('act.refuel.noFF'));")
E('act.refuel.noWarehouses', 'No exchange warehouses found', '找不到交易所仓库')
R(f, "log.warning('No exchange warehouses found');", "log.warning(t('act.refuel.noWarehouses'));")
R(f, "assert(origin, 'Invalid origin');", "assert(origin, t('act.f.invalidOrigin'));")
E('act.refuel.noShips', 'No ships are docked near {0}', '{0} 附近没有停靠的船')
E('act.refuel.noNeed', 'No ships need refueling near {0}', '{0} 附近的船都不需要加油')
R(f, 'log.info(`No ships are docked near ${originName}`);', "log.info(t('act.refuel.noShips', originName));")
R(f, 'log.info(`No ships need refueling near ${originName}`);', "log.info(t('act.refuel.noNeed', originName));")
E('act.refuel.notEnough', 'Not enough {0} at {1}. Some ships will not be refueled.', '{1} 的 {0} 不够，有些船加不上油。')
R(f, 'log.warning(`Not enough SF at ${originName}. Some ships will not be refueled.`);', "log.warning(t('act.refuel.notEnough', 'SF', originName));")
R(f, 'log.warning(`Not enough FF at ${originName}. Some ships will not be refueled.`);', "log.warning(t('act.refuel.notEnough', 'FF', originName));")
f = A+'refuel/Edit.vue'
label(f, 'Origin', 'act.f.origin')
R(f, ':options="storages"', ':options="tOptions(storages)"')
E('act.refuel.buy', 'Buy Missing Fuel', '燃料不够时购买')
E('act.refuel.buyTip', 'Whether the fuel will be bought if there is not enough stock (CX warehouse only).', '库存不够时是否自动购买燃料（只适用于交易所仓库）。')
E('act.refuel.buyToggle', 'buy fuel', '购买燃料')
R(f, '''    label="Buy Missing Fuel"
    tooltip="Whether the fuel will be bought if there is not enough stock (CX warehouse only).">
    <RadioItem v-model="buyMissingFuel">buy fuel</RadioItem>''', '''    :label="t('act.refuel.buy')"
    :tooltip="t('act.refuel.buyTip')">
    <RadioItem v-model="buyMissingFuel">{{ t('act.refuel.buyToggle') }}</RadioItem>''')
f = A+'refuel/Configure.vue'
label(f, 'From', 'act.f.from')
R(f, "options.push({ label: 'No locations available', value: undefined! });", "options.push({ label: t('act.f.noLocations'), value: undefined! });")
f = A+'refuel/REFUELACT.ts'
E('act.refuel.title', 'REFUEL ALL EXCHANGES', '所有交易所加油')
E('act.refuel.cmdDesc', 'Executes a refuel action package for all ships docked at exchanges.', '为停在各交易所的所有船执行加油动作包。')
R(f, "name: 'REFUEL ALL EXCHANGES',", "name: t('act.refuel.title'),")
R(f, "description: 'Executes a refuel action package for all ships docked at exchanges.',", "description: t('act.refuel.cmdDesc'),")

S('XIT ACT —— 合同运输 / 合同交易（CONT Ship / CONT Trade）')
f = A+'cont-locations.ts'
R(f, 'return `[${value.slice(groupTargetPrefix.length)}] target`;', "return t('act.f.groupTarget', value.slice(groupTargetPrefix.length));")
f = A+'cont-ship/cont-ship.ts'
E('act.cship.short', 'Create a shipping contract draft', '创建运输合同草稿')
R(f, "shortDescription: 'Create a shipping contract draft',", "shortDescription: t('act.cship.short'),")
R(f, "? (config?.origin ?? 'configured location')", "? (config?.origin ?? t('act.f.configuredLocation'))")
R(f, "? (config?.destination ?? 'configured location')", "? (config?.destination ?? t('act.f.configuredLocation'))")
E('act.cship.perTon', ' @ {0}/t', '，{0}/吨')
E('act.cship.desc', 'Send contract for [{0}] from {1} to {2}{3}', '为 [{0}] 发运输合同：{1} → {2}{3}')
R(f, "const paymentStr = payment > 0 ? ` @ ${fixed02(payment)}/t` : '';", "const paymentStr = payment > 0 ? t('act.cship.perTon', fixed02(payment)) : '';")
R(f, 'return `Send contract for [${action.group}] from ${origin} to ${dest}${paymentStr}`;', "return t('act.cship.desc', action.group, origin, dest, paymentStr);")
R(f, "assert(materials, 'Invalid material group');", "assert(materials, t('act.f.invalidGroup'));")
R(f, "assert(contOrigin, 'Invalid origin');", "assert(contOrigin, t('act.f.invalidOrigin'));")
R(f, "assert(contDest, 'Invalid destination');", "assert(contDest, t('act.f.invalidDest'));")
f = A+'cont-ship/Edit.vue'
label(f, 'Material Group', 'act.f.group'); label(f, 'Origin', 'act.f.origin'); label(f, 'Destination', 'act.f.destination')
label(f, 'Currency', 'act.f.currency'); label(f, 'Days to Fulfill', 'act.f.daysToFulfill')
E('act.cship.payPerTon', 'Payment per Ton', '每吨报酬')
E('act.cship.autoProvision', 'Auto-provision', '自动供货')
E('act.cship.autoProvisionToggle', 'enable auto-provision', '启用自动供货')
label(f, 'Payment per Ton', 'act.cship.payPerTon'); label(f, 'Auto-provision', 'act.cship.autoProvision')
R(f, '<RadioItem v-model="autoProvision">enable auto-provision</RadioItem>', "<RadioItem v-model=\"autoProvision\">{{ t('act.cship.autoProvisionToggle') }}</RadioItem>")
R(f, 'label: `[${x.name}] target`,', "label: t('act.f.groupTarget', x.name!),")
R(f, ':options="locationOptions"', ':options="tOptions(locationOptions)"', 2)
f = A+'cont-ship/Configure.vue'
R(f, 'label="From"', ":label=\"t('act.f.from')\"", 2)
R(f, 'label="To"', ":label=\"t('act.f.to')\"", 2)
label(f, 'Auto-provision', 'act.cship.autoProvision')
f = A+'cont-trade/cont-trade.ts'
E('act.ctrade.short', 'Create a buying or selling contract draft', '创建购买或出售合同草稿')
R(f, "shortDescription: 'Create a buying or selling contract draft',", "shortDescription: t('act.ctrade.short'),")
R(f, "const tradeLabel = action.contTradeType === 'SELLING' ? 'Sell' : 'Buy';", "const tradeLabel = action.contTradeType === 'SELLING' ? t('act.cont.sell') : t('act.cont.buy');")
R(f, "? (config?.location ?? 'configured location')", "? (config?.location ?? t('act.f.configuredLocation'))")
E('act.ctrade.desc', '{0} contract for [{1}] at {2}', '在 {2} 为 [{1}] 发{0}合同')
R(f, 'return `${tradeLabel} contract for [${action.group}] at ${location}`;', "return t('act.ctrade.desc', tradeLabel, action.group, location);")
R(f, "assert(materials, 'Invalid material group');", "assert(materials, t('act.f.invalidGroup'));")
E('act.ctrade.noMaterials', 'Material group has no materials to trade', '物资组里没有要交易的物资')
R(f, "assert(traded.length > 0, 'Material group has no materials to trade');", "assert(traded.length > 0, t('act.ctrade.noMaterials'));")
E('act.ctrade.needPrice', 'Each material in [{0}] needs a price from {1} to {2}. Use a Paste group with 3 columns (ticker, amount, price).', '[{0}] 里每种物资都需要一个 {1} 到 {2} 之间的价格。请用三列（代码、数量、价格）的「粘贴」物资组。')
R(f, '`Each material in [${data.group}] needs a price from ${minContractPrice} to ${maxContractPrice}. Use a Paste group with 3 columns (ticker, amount, price).`,', "t('act.ctrade.needPrice', data.group, minContractPrice, maxContractPrice),")
R(f, "assert(location, 'Invalid location');", "assert(location, t('act.f.invalidLocation'));")
f = A+'cont-trade/Edit.vue'
label(f, 'Material Group', 'act.f.group'); label(f, 'Location', 'act.f.location'); label(f, 'Currency', 'act.f.currency'); label(f, 'Days to Fulfill', 'act.f.daysToFulfill')
E('act.ctrade.type', 'Trade Type', '交易类型')
label(f, 'Trade Type', 'act.ctrade.type')
R(f, ':options="tradeTypes"', ':options="tOptions(tradeTypes)"')
R(f, 'label: `[${x.name}] target`,', "label: t('act.f.groupTarget', x.name!),")
R(f, ':options="locationOptions"', ':options="tOptions(locationOptions)"')
f = A+'cont-trade/Configure.vue'
R(f, 'label="Location"', ":label=\"t('act.f.location')\"", 2)

S('XIT ACT —— 州长维护数据（GovBurn Data）')
f = A+'govburn-data/govburn-data.ts'
E('act.gbd.short', 'Collect planetary upkeep data via POPI/POPID/COGC buffers', '通过 POPI / POPID / COGC 窗口收集星球维护数据')
E('act.gbd.desc', 'Collect gov upkeep data for {0}', '收集 {0} 的政府维护数据')
E('act.gbd.noPlanet', 'Planet not found', '找不到星球')
R(f, "shortDescription: 'Collect planetary upkeep data via POPI/POPID/COGC buffers',", "shortDescription: t('act.gbd.short'),")
R(f, "description: action => (action.planet ? `Collect gov upkeep data for ${action.planet}` : '--'),", "description: action => (action.planet ? t('act.gbd.desc', action.planet) : '--'),")
R(f, "assert(planet, 'Planet not found');", "assert(planet, t('act.gbd.noPlanet'));")
f = A+'govburn-data/Edit.vue'
E('act.gbd.placeholder', 'Natural ID or name', '星球编号或名字')
R(f, '<Active label="Planet" :error="planetError">', "<Active :label=\"t('act.f.planet')\" :error=\"planetError\">")
R(f, 'placeholder="Natural ID or name"', ":placeholder=\"t('act.gbd.placeholder')\"")

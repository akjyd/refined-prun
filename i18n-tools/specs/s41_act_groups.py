from tr import S, E, R
G = 'src/features/XIT/ACT/material-groups/'

S('XIT ACT —— 物资组：手动（Manual）')
f = G+'manual/manual.ts'
E('act.manual.short', 'A fixed list of materials and quantities', '固定的物资和数量清单')
R(f, "shortDescription: 'A fixed list of materials and quantities',", "shortDescription: t('act.manual.short'),")
E('act.manual.missing', 'Missing materials.', '缺少物资。')
R(f, "log.error('Missing materials.');", "log.error(t('act.manual.missing'));")
f = G+'manual/Edit.vue'
E('act.manual.amountN', 'Material Amount #{0}', '数量 #{0}')
E('act.manual.addMaterial', 'ADD MATERIAL', '添加物资')
R(f, ':label="`Material Ticker #${i + 1}`"', ":label=\"t('act.f.tickerN', i + 1)\"")
R(f, ':label="`Material Amount #${i + 1}`"', ":label=\"t('act.manual.amountN', i + 1)\"")
R(f, '@click="onAddClick">ADD MATERIAL</PrunButton>', "@click=\"onAddClick\">{{ t('act.manual.addMaterial') }}</PrunButton>")

S('XIT ACT —— 物资组：粘贴（Paste）')
f = G+'paste/paste.ts'
E('act.paste.short', 'Paste materials from clipboard at execution time', '执行时从剪贴板粘贴物资清单')
E('act.paste.desc', 'Paste materials at execution time', '执行时粘贴物资')
E('act.paste.invalid', 'Invalid or missing pasted materials.', '粘贴的物资无效或为空。')
R(f, "shortDescription: 'Paste materials from clipboard at execution time',", "shortDescription: t('act.paste.short'),")
R(f, "return 'Paste materials at execution time';", "return t('act.paste.desc');")
R(f, "log.error('Invalid or missing pasted materials.');", "log.error(t('act.paste.invalid'));")
f = G+'paste/Configure.vue'
E('act.paste.materials', 'Materials', '物资')
E('act.paste.placeholder', 'Paste from spreadsheet or type manually\nTICKER  AMOUNT  PRICE\nRAT     100     530\n\nPrice column is optional; at most 3 significant figures.\nOne delimiter per paste: tab, comma or semicolon.', '从表格粘贴或手动输入\n代码    数量    价格\nRAT     100     530\n\n价格列可以不填，最多 3 位有效数字。\n一次粘贴只能用一种分隔符：Tab、逗号或分号。')
R(f, '<Active label="Materials" :error="hasError">', "<Active :label=\"t('act.paste.materials')\" :error=\"hasError\">")
R(f, ''':placeholder="`Paste from spreadsheet or type manually\\nTICKER  AMOUNT  PRICE\\nRAT     100     530\\n\\nPrice column is optional; at most 3 significant figures.\\nOne delimiter per paste: tab, comma or semicolon.`"''', ''':placeholder="t('act.paste.placeholder')"''')
E('act.paste.row', 'Row {0}', '第 {0} 行')
R(f, '<span :class="$style.line">Row {{ error.line }}</span>', "<span :class=\"$style.line\">{{ t('act.paste.row', error.line) }}</span>")
E('act.paste.rowErrors', '{0} of {1} rows have errors', '{1} 行中有 {0} 行出错')
E('act.paste.none', 'No materials parsed', '没有识别出任何物资')
E('act.paste.ready1', '{0} material ready', '{0} 种物资就绪')
E('act.paste.readyN', '{0} materials ready', '{0} 种物资就绪')
R(f, 'return `${errorCount} of ${filledRowCount.value} rows have errors`;', "return t('act.paste.rowErrors', errorCount, filledRowCount.value);")
R(f, "return 'No materials parsed';", "return t('act.paste.none');")
R(f, "return `${rowCount.value} material${rowCount.value === 1 ? '' : 's'} ready`;", "return t(rowCount.value === 1 ? 'act.paste.ready1' : 'act.paste.readyN', rowCount.value);")
f = G+'paste/paste-parse.ts'
for d, en, zh in [('\\t', 'tab-separated', 'Tab 分隔'), (';', 'semicolon-separated', '分号分隔'), (',', 'comma-separated', '逗号分隔')]:
    key = {'tab-separated': 'tab', 'semicolon-separated': 'semicolon', 'comma-separated': 'comma'}[en]
    E(f'act.paste.delim.{key}', en, zh)
    R(f, f"  '{d}': '{en}',", f"  '{d}': t('act.paste.delim.{key}'),")
for key, en, zh, old, new in [
    ('notPositive', '"{0}" is not a finite positive number', '“{0}”不是有效的正数', 'return { error: `"${raw}" is not a finite positive number` };', "return { error: t('act.paste.notPositive', raw) };"),
    ('qtyAmbiguous', 'quantity "{0}" has ambiguous separators; write it without grouping', '数量“{0}”的分隔符有歧义，请去掉千位分隔符', 'return { error: `quantity "${raw}" has ambiguous separators; write it without grouping` };', "return { error: t('act.paste.qtyAmbiguous', raw) };"),
    ('qtyWhole', 'quantity "{0}" is not a whole number', '数量“{0}”不是整数', 'return { error: `quantity "${raw}" is not a whole number` };', "return { error: t('act.paste.qtyWhole', raw) };"),
    ('priceAmbiguous', 'price "{0}" has ambiguous separators; write it without grouping', '价格“{0}”的分隔符有歧义，请去掉千位分隔符', 'return { error: `price "${raw}" has ambiguous separators; write it without grouping` };', "return { error: t('act.paste.priceAmbiguous', raw) };"),
    ('priceDecimals', 'price "{0}" has more than two decimal places', '价格“{0}”超过两位小数', 'return { error: `price "${raw}" has more than two decimal places` };', "return { error: t('act.paste.priceDecimals', raw) };"),
    ('priceSig', 'price "{0}" has more than {1} significant figures (use {2})', '价格“{0}”超过 {1} 位有效数字（请改用 {2}）', 'error: `price "${raw}" has more than ${maxPriceSignificantFigures} significant figures (use ${suggestion})`,', "error: t('act.paste.priceSig', raw, maxPriceSignificantFigures, suggestion),"),
    ('fields', 'expected TICKER, QUANTITY[, PRICE] (got {0} fields)', '格式应为 代码, 数量[, 价格]（实际有 {0} 列）', 'reason: `expected TICKER, QUANTITY[, PRICE] (got ${fields.length} fields)`,', "reason: t('act.paste.fields', fields.length),"),
    ('mixed', 'Paste mixes {0} and {1} rows. Use one delimiter throughout.', '粘贴内容混用了{0}和{1}的行。请全部用同一种分隔符。', 'result.fatal = `Paste mixes ${delimiterNames[result.delimiter]} and ${delimiterNames[delimiter]} rows. Use one delimiter throughout.`;', "result.fatal = t(\n        'act.paste.mixed',\n        delimiterNames[result.delimiter],\n        delimiterNames[delimiter],\n      );"),
    ('unknownTicker', 'unknown ticker "{0}"', '未知的物资代码“{0}”', 'result.errors.push({ line, reason: `unknown ticker "${tickerRaw}"` });', "result.errors.push({ line, reason: t('act.paste.unknownTicker', tickerRaw) });"),
    ('conflict', 'conflicting price for {0}; line {1} used {2}', '{0} 的价格有冲突；第 {1} 行用的是 {2}', 'reason: `conflicting price for ${ticker}; line ${previous.line} used ${previous.price}`,', "reason: t('act.paste.conflict', ticker, previous.line, previous.price),"),
]:
    E(f'act.paste.{key}', en, zh)
    R(f, old, new)
E('act.paste.notNumber', '"{0}" is not a supported number', '“{0}”不是能识别的数字')
R(f, 'return { error: `"${raw}" is not a supported number` };', "return { error: t('act.paste.notNumber', raw) };", 2)

S('XIT ACT —— 物资组：维修（Repair）')
f = G+'repair/repair.ts'
E('act.repair.short', 'Calculate repair materials for aging buildings', '按建筑老化程度计算维修物资')
R(f, "shortDescription: 'Calculate repair materials for aging buildings',", "shortDescription: t('act.repair.short'),")
E('act.repair.older1', 'older than {0} day', '超过 {0} 天')
E('act.repair.olderN', 'older than {0} days', '超过 {0} 天')
E('act.repair.desc1', 'Repair buildings on {0} {1} in {2} day', '维修 {0} 上{1}的建筑（按 {2} 天后计算）')
E('act.repair.descN', 'Repair buildings on {0} {1} in {2} days', '维修 {0} 上{1}的建筑（按 {2} 天后计算）')
R(f, "const daysPart = days !== undefined ? `older than ${daysLabel} day${days == 1 ? '' : 's'}` : '';", "const daysPart =\n      days !== undefined\n        ? t(days == 1 ? 'act.repair.older1' : 'act.repair.olderN', String(daysLabel))\n        : '';")
R(f, "return `Repair buildings on ${data.planet} ${daysPart} in ${advanceLabel} day${advanceDays == 1 ? '' : 's'}`;", "return t(\n      advanceDays == 1 ? 'act.repair.desc1' : 'act.repair.descN',\n      data.planet,\n      daysPart,\n      String(advanceLabel),\n    );")
E('act.repair.noPlanet', 'Resupply planet is not configured', '没有设置星球')
E('act.repair.noData', 'Missing data on repair planet', '缺少要维修星球的数据')
R(f, "log.error('Resupply planet is not configured');", "log.error(t('act.repair.noPlanet'));")
R(f, "log.error('Missing data on repair planet');", "log.error(t('act.repair.noData'));")
E('act.repair.threshold', 'Day Threshold', '天数阈值')
E('act.repair.thresholdTip', 'All buildings older than this threshold will be repaired.', '超过这个天数的建筑都会被维修。')
E('act.repair.thresholdTipEdit', 'All buildings older than this threshold will be repaired. If no number is provided all buildings are repaired.', '超过这个天数的建筑都会被维修。不填则维修全部建筑。')
E('act.repair.offset', 'Time Offset', '提前天数')
E('act.repair.offsetTip', 'The number of days in the future this repair will be conducted.', '按多少天后进行维修来计算物资。')
f = G+'repair/Configure.vue'
R(f, '<Active v-if="data.planet === configurableValue" label="Planet">', "<Active v-if=\"data.planet === configurableValue\" :label=\"t('act.f.planet')\">")
R(f, '''      label="Day Threshold"
      tooltip="All buildings older than this threshold will be repaired.">''', '''      :label="t('act.repair.threshold')"
      :tooltip="t('act.repair.thresholdTip')">''')
R(f, '''      label="Time Offset"
      tooltip="The number of days in the future this repair will be conducted.">''', '''      :label="t('act.repair.offset')"
      :tooltip="t('act.repair.offsetTip')">''')
f = G+'repair/Edit.vue'
R(f, '<Active label="Planet" :error="planetError">', "<Active :label=\"t('act.f.planet')\" :error=\"planetError\">")
R(f, ':options="planets"', ':options="tOptions(planets)"')
R(f, '''    label="Day Threshold"
    tooltip="All buildings older than this threshold will be repaired.
     If no number is provided all buildings are repaired.">''', '''    :label="t('act.repair.threshold')"
    :tooltip="t('act.repair.thresholdTipEdit')">''')
R(f, '''    label="Time Offset"
    tooltip="The number of days in the future this repair will be conducted."''', '''    :label="t('act.repair.offset')"
    :tooltip="t('act.repair.offsetTip')"''')

S('XIT ACT —— 物资组：补给（Resupply）')
f = G+'resupply/resupply.ts'
E('act.resupply.short', 'Calculate consumables needed based on burn rate', '按消耗速度计算需要的物资')
R(f, "shortDescription: 'Calculate consumables needed based on burn rate',", "shortDescription: t('act.resupply.short'),")
E('act.resupply.desc1', 'Resupply {0} with {1} day of supplies', '给 {0} 补给 {1} 天的物资')
E('act.resupply.descN', 'Resupply {0} with {1} days of supplies', '给 {0} 补给 {1} 天的物资')
R(f, "return `Resupply ${data.planet} with ${daysLabel} day${data.days == 1 ? '' : 's'} of supplies`;", "return t(\n      data.days == 1 ? 'act.resupply.desc1' : 'act.resupply.descN',\n      data.planet,\n      String(daysLabel),\n    );")
E('act.resupply.noPlanet', 'Missing resupply planet', '缺少要补给的星球')
E('act.resupply.noDays', 'Missing resupply days', '缺少补给天数')
E('act.resupply.noBase', 'Base is not present on {0}', '{0} 上没有基地')
E('act.resupply.loading', 'Loading {0} burn data...', '正在加载 {0} 的消耗数据……')
R(f, "log.error('Missing resupply planet');", "log.error(t('act.resupply.noPlanet'));")
R(f, "log.error('Missing resupply days');", "log.error(t('act.resupply.noDays'));")
R(f, 'log.error(`Base is not present on ${data.planet}`);', "log.error(t('act.resupply.noBase', data.planet ?? ''));")
R(f, 'setStatus(`Loading ${name} burn data...`);', "setStatus(t('act.resupply.loading', name ?? ''));")
E('act.resupply.days', 'Days', '天数')
E('act.resupply.daysTip', 'The number of days of supplies to refill the planet with.', '给这个星球补给多少天的物资。')
f = G+'resupply/Configure.vue'
R(f, '<Active v-if="data.planet === configurableValue" label="Planet">', "<Active v-if=\"data.planet === configurableValue\" :label=\"t('act.f.planet')\">")
R(f, '''      label="Days"
      tooltip="The number of days of supplies to refill the planet with.">''', '''      :label="t('act.resupply.days')"
      :tooltip="t('act.resupply.daysTip')">''')
E('act.resupply.materials', 'Materials', '物资范围')
E('act.resupply.materialsTip', 'Which materials to include in the resupply group.', '补给物资组里包括哪些物资。')
R(f, '<Active label="Materials" tooltip="Which materials to include in the resupply group.">', "<Active :label=\"t('act.resupply.materials')\" :tooltip=\"t('act.resupply.materialsTip')\">")
R(f, ':options="materialFilterOptions"', ':options="tOptions(materialFilterOptions)"')
R(f, '<span>Total Weight </span>', "<span>{{ t('act.run.totalWeight') }}</span>")
R(f, '<span>, Total Volume </span>', "<span>{{ t('act.run.totalVolume') }}</span>")
E('act.resupply.noTotals', 'Total Weight --, Total Volume --', '总重量 --，总体积 --')
R(f, '<span>Total Weight --, Total Volume --</span>', "<span>{{ t('act.resupply.noTotals') }}</span>")
E('act.resupply.fit', 'Fit to Ship', '按船型装满')
E('act.resupply.fitSelected', 'Fit Selected', '按所选船装满')
R(f, '<span>Fit to Ship</span>', "<span>{{ t('act.resupply.fit') }}</span>")
R(f, '<span>Fit Selected</span>', "<span>{{ t('act.resupply.fitSelected') }}</span>")
f = G+'resupply/Edit.vue'
R(f, '<Active label="Planet" :error="planetError">', "<Active :label=\"t('act.f.planet')\" :error=\"planetError\">")
R(f, ':options="planets"', ':options="tOptions(planets)"')
R(f, '''    label="Days"
    tooltip="The number of days of supplies to refill the planet with."''', '''    :label="t('act.resupply.days')"
    :tooltip="t('act.resupply.daysTip')"''')
E('act.resupply.configureOnExec', 'configure on execution', '执行时再填')
R(f, '<RadioItem v-model="configureDaysOnExecution">configure on execution</RadioItem>', "<RadioItem v-model=\"configureDaysOnExecution\">{{ t('act.resupply.configureOnExec') }}</RadioItem>")
for key, en, zh, tip_en, tip_zh, model, toggle_en, toggle_zh in [
    ('exclusions', 'Material Exclusions', '排除的物资', 'Materials to be excluded from the group. List material tickers separated by commas.', '不放进物资组的物资。填物资代码，用逗号分隔。', None, None, None),
    ('useBaseInv', 'Use Base Inv', '计入基地库存', 'Whether to count the materials currently in the base towards the totals.', '计算时是否扣除基地里现有的物资。', 'useBaseInventory', 'use base inv', '计入基地库存'),
    ('wfOnly', 'Workforce Only', '只算工人消耗品', 'Whether to limit the materials in the group to workforce consumables only.', '是否只包括工人消耗品。', 'workforceOnly', 'workforce only', '只算工人消耗品'),
]:
    E(f'act.resupply.{key}', en, zh); E(f'act.resupply.{key}Tip', tip_en, tip_zh)
    R(f, f'''    label="{en}"
    tooltip="{tip_en}">''', f'''    :label="t('act.resupply.{key}')"
    :tooltip="t('act.resupply.{key}Tip')">''')
    if model:
        E(f'act.resupply.{key}Toggle', toggle_en, toggle_zh)
        R(f, f'<RadioItem v-model="{model}">{toggle_en}</RadioItem>', f"<RadioItem v-model=\"{model}\">{{{{ t('act.resupply.{key}Toggle') }}}}</RadioItem>")

from tr import S, E, R
D = 'src/features/XIT/SET/'

S('通用确认框（整个插件）')
f = 'src/infrastructure/prun-ui/tile-overlay.ts'
E('common.areYouSure', 'Are you sure?', '确定吗？')
E('common.confirm', 'Confirm', '确认')
R(f, "const message = options?.message ?? 'Are you sure?';", "const message = options?.message ?? t('common.areYouSure');")
R(f, "const confirmLabel = options?.confirmLabel ?? 'Confirm';", "const confirmLabel = options?.confirmLabel ?? t('common.confirm');")

S('XIT SET —— 命令与标签页')
f = D+'SET.ts'
E('set.title', 'REFINED PRUN SETTINGS', 'REFINED PRUN 设置')
E('set.description', 'Refined PrUn settings.', 'Refined PrUn 设置。')
E('set.parameters', 'Settings Tab Identifier, Feature Identifier (FEAT)', '标签页代码、功能 ID（FEAT）')
R(f, "name: 'REFINED PRUN SETTINGS',", "name: t('set.title'),")
R(f, "description: 'Refined PrUn settings.',", "description: t('set.description'),")
R(f, "optionalParameters: 'Settings Tab Identifier, Feature Identifier (FEAT)',", "optionalParameters: t('set.parameters'),")
f = D+'SET.vue'
for key, en, zh in [('gameplay','Gameplay','常规'),('features','Features','功能开关'),('financial','Financial','财务'),('buffers','Buffers','窗口大小')]:
    E(f'set.tab.{key}', en, zh)
    R(f, f"    label: '{en}',", f"    label: t('set.tab.{key}'),")

S('XIT SET —— 功能开关页')
f = D+'FEAT.vue'
E('set.feat.changeSet', 'Change feature set', '切换功能集')
E('set.feat.switchTo', 'SWITCH TO {0}', '切换到 {0}')
E('set.feat.search', 'Search', '搜索')
E('set.feat.restart', 'RESTART THE GAME TO APPLY CHANGES', '刷新游戏以应用更改')
E('set.feat.count', 'Features: {0}', '功能：{0} 项')
E('set.feat.off', '({0} off) ', '（{0} 项已关闭）')
E('set.feat.more', '(+{0} more available in full mode)', '（FULL 模式下另有 {0} 项）')
E('set.feat.fullTitle', 'Full Mode Features', 'FULL 模式专属功能')
R(f, '<Commands label="Change feature set">', "<Commands :label=\"t('set.feat.changeSet')\">")
R(f, "SWITCH TO {{ isFullMode ? 'BASIC' : 'FULL' }}", "{{ t('set.feat.switchTo', isFullMode ? 'BASIC' : 'FULL') }}")
R(f, ':class="$style.warningRoot" label="Search">', ":class=\"$style.warningRoot\" :label=\"t('set.feat.search')\">")
R(f, "\n          RESTART THE GAME TO APPLY CHANGES\n", "\n          {{ t('set.feat.restart') }}\n")
R(f, "      Features: {{ sorted.length }}\n", "      {{ t('set.feat.count', sorted.length) }}\n")
R(f, '<span v-if="disabledCount > 0">({{ disabledCount }} off) </span>', "<span v-if=\"disabledCount > 0\">{{ t('set.feat.off', disabledCount) }}</span>")
R(f, '<span v-if="!isFullMode">(+{{ advanced.length }} more available in full mode)</span>', "<span v-if=\"!isFullMode\">{{ t('set.feat.more', advanced.length) }}</span>")
R(f, '<SectionHeader>Full Mode Features</SectionHeader>', "<SectionHeader>{{ t('set.feat.fullTitle') }}</SectionHeader>")
R(f, '<div :class="$style.description">{{ feature.description }}</div>', '<div :class="$style.description">{{ tFeature(feature.id, feature.description) }}</div>', 2)
# Search in both the English and Chinese description; keep CJK characters as keywords.
R(f, "  searchIndex.set(feature.id, `${feature.id} ${feature.description}`.toLowerCase());", "  searchIndex.set(\n    feature.id,\n    `${feature.id} ${feature.description} ${tFeature(feature.id, '')}`.toLowerCase(),\n  );")
R(f, "    .replaceAll(/\\W/g, ' ')", "    .replaceAll(/[^\\p{L}\\p{N}_-]/gu, ' ')")

S('XIT SET —— 常规页')
f = D+'GAME.vue'
for key, en, zh in [('smooth','Smooth','平滑'),('aligned','Aligned','对齐'),('raw','Raw','原始'),('default','Default','默认'),('custom','Custom','自定义'),('after','After','在后'),('before','Before','在前'),('hasSpace','Has space','有空格'),('noSpace','No space','无空格')]:
    E(f'set.opt.{key}', en, zh)
    R(f, f"    label: '{en}',", f"    label: t('set.opt.{key}'),")
for key, en, zh in [('appearance','Appearance','外观'),('burn','Burn Settings','消耗设置'),('importExport','Import/Export','导入 / 导出'),('backups','Backups','备份'),('danger','Danger Zone','危险操作')]:
    E(f'set.game.{key}', en, zh)
    R(f, f'<SectionHeader>{en}</SectionHeader>', f"<SectionHeader>{{{{ t('set.game.{key}') }}}}</SectionHeader>")
E('set.game.timeFormat', 'Time format', '时间格式')
E('set.game.chartType', 'Default CX Chart Type', '交易所图表默认类型')
R(f, '<Active label="Time format">', "<Active :label=\"t('set.game.timeFormat')\">")
R(f, '<Active label="Default CX Chart Type">', "<Active :label=\"t('set.game.chartType')\">")
E('set.game.currency', 'Currency Symbol', '货币符号')
E('set.game.currencyTip', 'Currency symbol used when displaying money values. Only shown in UI added by Refined PrUn.', '显示金额时用的货币符号。只影响 Refined PrUn 加的界面。')
R(f, '''    Currency Symbol
    <Tooltip
      :class="$style.tooltip"
      tooltip="Currency symbol used when displaying money values.
       Only shown in UI added by Refined PrUn." />''', '''    {{ t('set.game.currency') }}
    <Tooltip :class="$style.tooltip" :tooltip="t('set.game.currencyTip')" />''')
for key, en, zh in [('symbol','Symbol','符号'),('customSymbol','Custom symbol','自定义符号'),('position','Position','位置')]:
    E(f'set.game.{key}', en, zh)
R(f, '<Active label="Symbol">', "<Active :label=\"t('set.game.symbol')\">")
R(f, '''v-if="currencySettings.preset === 'CUSTOM'" label="Custom symbol">''', '''v-if="currencySettings.preset === 'CUSTOM'" :label="t('set.game.customSymbol')">''')
R(f, '''v-if="currencySettings.preset !== 'DEFAULT'" label="Position">''', '''v-if="currencySettings.preset !== 'DEFAULT'" :label="t('set.game.position')">''')
E('set.game.spacing', 'Spacing', '间距')
E('set.game.spacingTip', 'The space between symbol and value.', '符号和数值之间是否加空格。')
R(f, '''      label="Spacing"
      tooltip="The space between symbol and value.">''', '''      :label="t('set.game.spacing')"
      :tooltip="t('set.game.spacingTip')">''')
for key, en, zh, tip_en, tip_zh in [
    ('red', 'Red', '红色', 'Threshold for red consumable level in burn calculations (in days).', '消耗品剩余天数低于多少显示红色。'),
    ('yellow', 'Yellow', '黄色', 'Threshold for yellow consumable level in burn calculations (in days).', '消耗品剩余天数低于多少显示黄色。'),
]:
    E(f'set.game.{key}', en, zh); E(f'set.game.{key}Tip', tip_en, tip_zh)
    R(f, f'''      label="{en}"
      tooltip="{tip_en}">''', f'''      :label="t('set.game.{key}')"
      :tooltip="t('set.game.{key}Tip')">''')
E('set.game.resupply', 'Resupply', '补给天数')
E('set.game.resupplyTip', "Default target amount of supplied days for the 'Need' column in XIT BURN. Can be overridden per planet in XIT PLS.", 'XIT BURN「需补」列默认补满的天数。可以在 XIT PLS 里按星球单独设置。')
R(f, '''      label="Resupply"
      tooltip="Default target amount of supplied days for the 'Need' column in XIT BURN.
       Can be overridden per planet in XIT PLS.">''', '''      :label="t('set.game.resupply')"
      :tooltip="t('set.game.resupplyTip')">''')
E('set.game.sidebar', 'Left Sidebar Buttons', '左侧边栏按钮')
E('set.game.sidebarTip', 'Create hotkeys on the left sidebar. The first value is what will be displayed, the second is the command.', '在左侧边栏添加快捷按钮。第一格是显示的文字，第二格是命令。')
R(f, '''    Left Sidebar Buttons
    <Tooltip
      :class="$style.tooltip"
      tooltip="Create hotkeys on the left sidebar.
         The first value is what will be displayed, the second is the command." />''', '''    {{ t('set.game.sidebar') }}
    <Tooltip :class="$style.tooltip" :tooltip="t('set.game.sidebarTip')" />''')
E('set.game.buttonN', 'Button {0}', '按钮 {0}')
R(f, ':label="`Button ${i + 1}`"', ":label=\"t('set.game.buttonN', i + 1)\"")
E('set.game.reset', 'RESET', '重置')
E('set.game.addNew', 'ADD NEW', '新增')
R(f, '@click="confirmResetSidebar">RESET</PrunButton>', "@click=\"confirmResetSidebar\">{{ t('set.game.reset') }}</PrunButton>")
R(f, '@click="addSidebarButton">ADD NEW</PrunButton>', "@click=\"addSidebarButton\">{{ t('set.game.addNew') }}</PrunButton>")
E('set.game.import', 'Import User Data', '导入用户数据')
E('set.game.export', 'Export User Data', '导出用户数据')
R(f, '@click="importUserDataAndReload">Import User Data</PrunButton>', "@click=\"importUserDataAndReload\">{{ t('set.game.import') }}</PrunButton>")
R(f, '@click="exportUserData">Export User Data</PrunButton>', "@click=\"exportUserData\">{{ t('set.game.export') }}</PrunButton>")
E('set.game.backupExport', 'Export', '导出')
E('set.game.backupRestore', 'Restore', '恢复')
E('set.game.backupDelete', 'Delete', '删除')
R(f, "\n          Export\n", "\n          {{ t('set.game.backupExport') }}\n")
R(f, "\n          Restore\n", "\n          {{ t('set.game.backupRestore') }}\n")
R(f, '@click="confirmDeleteBackup($event, backup)">Delete</PrunButton>', "@click=\"confirmDeleteBackup($event, backup)\">{{ t('set.game.backupDelete') }}</PrunButton>")
E('set.game.restoreConfirm', 'Are you sure you want to restore this backup? This will overwrite your current data.', '确定要恢复这个备份吗？这会覆盖你现在的数据。')
R(f, "        'Are you sure you want to restore this backup? This will overwrite your current data.',", "        t('set.game.restoreConfirm'),")
E('set.game.resetAll', 'Reset All Data', '重置全部数据')
R(f, '@click="confirmResetAllData">Reset All Data</PrunButton>', "@click=\"confirmResetAllData\">{{ t('set.game.resetAll') }}</PrunButton>")

S('XIT SET —— 财务页')
f = D+'FIN.vue'
E('set.fin.equity', 'Equity Mode', '权益模式')
E('set.fin.equityTip', 'In this mode, equity includes the market value of all assets, including ships, HQ upgrades, and ARC. Not recommended for beginners, as starter ships have a disproportionate value compared to starting resources. Note that even with this mode disabled, your financial data history is still collected in full, so you can always switch to full equity mode later.', '开启后，权益会计入所有资产的市值，包括船、总部升级和 ARC。不建议新手开启：初始船只的价值相对初始资源过高。即使不开，财务历史数据也会完整记录，以后随时可以切换。')
E('set.fin.equityToggle', 'full equity', '完整权益')
R(f, '<SectionHeader>Equity Mode</SectionHeader>', "<SectionHeader>{{ t('set.fin.equity') }}</SectionHeader>")
R(f, '''    label="Equity Mode"
    tooltip="In this mode, equity includes the market value of all assets,
     including ships, HQ upgrades, and ARC. Not recommended for beginners,
     as starter ships have a disproportionate value compared to starting resources.
     Note that even with this mode disabled, your financial data history is still
     collected in full, so you can always switch to full equity mode later."''', '''    :label="t('set.fin.equity')"
    :tooltip="t('set.fin.equityTip')"''')
R(f, '<RadioItem v-model="userData.fullEquityMode">full equity</RadioItem>', "<RadioItem v-model=\"userData.fullEquityMode\">{{ t('set.fin.equityToggle') }}</RadioItem>")
E('set.fin.prices', 'Price Settings', '价格设置')
R(f, '<SectionHeader>Price Settings</SectionHeader>', "<SectionHeader>{{ t('set.fin.prices') }}</SectionHeader>")
E('set.fin.mm', 'MM Materials', '做市商物资')
E('set.fin.mmTip', 'Comma-separated list of Market Maker materials. The price of these materials will be equal to MM Bid price.', '做市商（MM）物资，用逗号分隔。这些物资按做市商收购价估值。')
R(f, '''    label="MM Materials"
    tooltip="Comma-separated list of Market Maker materials.
     The price of these materials will be equal to MM Bid price.">''', '''    :label="t('set.fin.mm')"
    :tooltip="t('set.fin.mmTip')">''')
E('set.fin.ignored', 'Ignored Materials', '忽略的物资')
E('set.fin.ignoredTip', 'Comma-separated list of ignored materials. The price of these materials is considered to be zero.', '忽略的物资，用逗号分隔。这些物资按 0 估值。')
R(f, '''    label="Ignored Materials"
    tooltip="Comma-separated list of ignored materials.
     The price of these materials is considered to be zero.">''', '''    :label="t('set.fin.ignored')"
    :tooltip="t('set.fin.ignoredTip')">''')
E('set.fin.points', 'Collected Data Points', '已采集的数据点')
R(f, '<SectionHeader>Collected Data Points</SectionHeader>', "<SectionHeader>{{ t('set.fin.points') }}</SectionHeader>")
E('set.fin.collect', 'Collect Data Point', '采集数据点')
R(f, "\n        Collect Data Point\n", "\n        {{ t('set.fin.collect') }}\n")
E('set.fin.hideMerge', 'Hide Backup Merge', '收起备份合并')
E('set.fin.merge', 'Merge Financial Backups', '合并财务备份')
R(f, "{{ showBackupMerge ? 'Hide Backup Merge' : 'Merge Financial Backups' }}", "{{ showBackupMerge ? t('set.fin.hideMerge') : t('set.fin.merge') }}")
for key, en, zh in [('date','Date','日期'),('equityCol','Equity','权益'),('command','Command','操作')]:
    E(f'set.fin.{key}', en, zh)
    R(f, f'<th>{en}</th>', f"<th>{{{{ t('set.fin.{key}') }}}}</th>")
R(f, '@click="confirmDataPointDelete($event, i)">delete</PrunButton>', "@click=\"confirmDataPointDelete($event, i)\">{{ t('act.common.deleteSmall') }}</PrunButton>")
E('set.fin.clearTip', 'Clear all historical financial data', '清空全部财务历史数据')
R(f, '''    Danger Zone
    <Tooltip :class="$style.tooltip" tooltip="Clear all historical financial data" />''', '''    {{ t('set.game.danger') }}
    <Tooltip :class="$style.tooltip" :tooltip="t('set.fin.clearTip')" />''')
E('set.fin.clear', 'Clear Financial Data', '清空财务数据')
R(f, '@click="confirmAllDataDelete">Clear Financial Data</PrunButton>', "@click=\"confirmAllDataDelete\">{{ t('set.fin.clear') }}</PrunButton>")
E('set.fin.deletePointConfirm', 'You are about to delete a historical data point. Do you want to continue?', '你要删除一个历史数据点。确定继续吗？')
E('set.fin.clearConfirm', 'You are about to clear all historical financial data. Do you want to continue?', '你要清空全部财务历史数据。确定继续吗？')
R(f, 'message: `You are about to delete a historical data point. Do you want to continue?`,', "message: t('set.fin.deletePointConfirm'),")
R(f, 'message: `You are about to clear all historical financial data. Do you want to continue?`,', "message: t('set.fin.clearConfirm'),")

S('XIT SET —— 窗口大小页')
f = D+'BFR.vue'
E('set.bfr.title', 'Override Default Buffer Sizes', '自定义窗口默认大小')
E('set.bfr.titleTip', 'The first matched rule will be used. If no rules match, the default buffer size will be used. You can reorganize the rules by dragging them up and down.', '使用第一条匹配的规则；都不匹配时使用默认大小。可以上下拖动调整规则顺序。')
R(f, '''    Override Default Buffer Sizes
    <Tooltip
      position="bottom"
      :class="$style.tooltip"
      tooltip="The first matched rule will be used. If no rules match, the default buffer size will be used.
        You can reorganize the rules by dragging them up and down." />''', '''    {{ t('set.bfr.title') }}
    <Tooltip position="bottom" :class="$style.tooltip" :tooltip="t('set.bfr.titleTip')" />''')
E('set.bfr.pickThis', 'CLICK TO PICK THIS BUFFER', '点击选择这个窗口')
E('set.bfr.cancel', 'CLICK ANYWHERE TO CANCEL', '点击任意位置取消')
R(f, "{{ pickedBuffer ? 'CLICK TO PICK THIS BUFFER' : 'CLICK ANYWHERE TO CANCEL' }}", "{{ pickedBuffer ? t('set.bfr.pickThis') : t('set.bfr.cancel') }}")
E('set.bfr.pick', 'PICK BUFFER', '选择窗口')
E('set.bfr.addRule', 'ADD NEW RULE', '新增规则')
R(f, '@click="picking = true">PICK BUFFER</PrunButton>', "@click=\"picking = true\">{{ t('set.bfr.pick') }}</PrunButton>")
R(f, '@click="addNewRule">ADD NEW RULE</PrunButton>', "@click=\"addNewRule\">{{ t('set.bfr.addRule') }}</PrunButton>")
E('set.bfr.command', 'Command', '命令')
E('set.bfr.commandTip', 'Can be a full command, a part of it, or a regular expression. Case-insensitive.', '可以是完整命令、命令的一部分或正则表达式，不区分大小写。')
R(f, '''            Command
            <Tooltip
              position="right"
              tooltip="Can be a full command, a part of it, or a regular expression. Case-insensitive." />''', '''            {{ t('set.bfr.command') }}
            <Tooltip position="right" :tooltip="t('set.bfr.commandTip')" />''')
E('set.bfr.width', 'Width', '宽')
E('set.bfr.height', 'Height', '高')
R(f, '<th>Width</th>', "<th>{{ t('set.bfr.width') }}</th>")
R(f, '<th>Height</th>', "<th>{{ t('set.bfr.height') }}</th>")
E('set.bfr.empty', 'Nothing here yet.', '还没有规则。')
R(f, '<td colspan="5">Nothing here yet.</td>', "<td colspan=\"5\">{{ t('set.bfr.empty') }}</td>")
R(f, '@click="deleteRule(rule)">DELETE</PrunButton>', "@click=\"deleteRule(rule)\">{{ t('act.common.delete') }}</PrunButton>")

S('XIT SET —— ACT 页')
f = D+'ACT.vue'
E('set.act.exclusions', 'CX Buy Exclusions', '交易所购买排除列表')
E('set.act.materials', 'Materials', '物资')
E('set.act.none', 'None', '无')
E('set.act.add', 'Add Materials', '添加物资')
E('set.act.tickers', 'Tickers', '物资代码')
E('set.act.tickersTip', 'ACT CX Buy actions skip these materials. Enter one or more material tickers separated by commas.', 'ACT 的交易所购买会跳过这些物资。可以填一个或多个物资代码，用逗号分隔。')
R(f, '<SectionHeader>CX Buy Exclusions</SectionHeader>', "<SectionHeader>{{ t('set.act.exclusions') }}</SectionHeader>")
R(f, '<Passive v-if="userData.settings.noBuy.length === 0" label="Materials">None</Passive>', "<Passive v-if=\"userData.settings.noBuy.length === 0\" :label=\"t('set.act.materials')\">\n    {{ t('set.act.none') }}\n  </Passive>")
R(f, '<SectionHeader>Add Materials</SectionHeader>', "<SectionHeader>{{ t('set.act.add') }}</SectionHeader>")
R(f, '''      label="Tickers"
      tooltip="ACT CX Buy actions skip these materials. Enter one or more material tickers separated by commas."''', '''      :label="t('set.act.tickers')"
      :tooltip="t('set.act.tickersTip')"''')
R(f, '@click="add">ADD</PrunButton>', "@click=\"add\">{{ t('act.common.add') }}</PrunButton>")

S('XIT SET PMMG —— 从 PMMG 导入')
f = D+'PMMG.vue'
E('set.pmmg.title', 'Import PMMG files', '导入 PMMG 文件')
R(f, '<SectionHeader>Import PMMG files</SectionHeader>', "<SectionHeader>{{ t('set.pmmg.title') }}</SectionHeader>")
for key, fn, en, zh in [('settings','importPmmgSettings','Import Settings','导入设置'),('finance','importPmmgFinancialHistory','Import Finances','导入财务'),('notes','importPmmgNotes','Import Notes','导入笔记'),('actions','importPmmgActions','Import Actions','导入动作包'),('lists','importPmmgCommandLists','Import Command Lists','导入命令列表')]:
    E(f'set.pmmg.{key}', en, zh)
    R(f, f'@click="{fn}">{en}</PrunButton>', f"@click=\"{fn}\">{{{{ t('set.pmmg.{key}') }}}}</PrunButton>")

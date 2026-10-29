from tr import S, E, R
B = 'src/features/XIT/BURN/'

S('XIT BURN —— 命令说明')
E('burn.description', 'Shows the number of days of consumables left.', '显示消耗品还能维持几天。')
E('burn.parameters', 'Planet Identifier(s), OVERALL, NOT', '星球编号（可多个）、OVERALL、NOT')
R(B+'BURN.ts', "description: 'Shows the number of days of consumables left.',", "description: t('burn.description'),")
R(B+'BURN.ts', "optionalParameters: 'Planet Identifier(s), OVERALL, NOT',", "optionalParameters: t('burn.parameters'),")

S('XIT BURN —— 顶部筛选开关')
for k, en, zh in [('red','RED','红'),('yellow','YELLOW','黄'),('green','GREEN','绿'),('inf','INF','无限'),('io','I/O','进/出')]:
    E(f'burn.filter.{k}', en, zh)
    R(B+'BURN.vue', f'<RadioItem v-model="{k}" horizontal>{en}</RadioItem>', f"<RadioItem v-model=\"{k}\" horizontal>{{{{ t('burn.filter.{k}') }}}}</RadioItem>")
E('burn.filter.prod', 'PROD', '生产')
E('burn.filter.prodTip', 'Toggle materials with production consumption. When off, hides materials only used in production.', '显示或隐藏有生产消耗的物资。关闭时，只用于生产的物资会被隐藏。')
E('burn.filter.wf', 'WF', '工人')
E('burn.filter.wfTip', 'Toggle materials with workforce consumption. When off, hides materials only consumed by workforce.', '显示或隐藏有工人消耗的物资。关闭时，只被工人消耗的物资会被隐藏。')
R(B+'BURN.vue', 'data-tooltip="Toggle materials with production consumption. When off, hides materials only used in production."', ":data-tooltip=\"t('burn.filter.prodTip')\"")
R(B+'BURN.vue', 'data-tooltip-position="bottom">\n        PROD\n', "data-tooltip-position=\"bottom\">\n        {{ t('burn.filter.prod') }}\n")
R(B+'BURN.vue', 'data-tooltip="Toggle materials with workforce consumption. When off, hides materials only consumed by workforce."', ":data-tooltip=\"t('burn.filter.wfTip')\"")
R(B+'BURN.vue', 'data-tooltip-position="bottom">\n        WF\n', "data-tooltip-position=\"bottom\">\n        {{ t('burn.filter.wf') }}\n")

S('XIT BURN —— 表头')
E('burn.col.inv', 'Inv', '库存')
E('burn.col.invTip', 'Stock at the base plus cargo on inbound ships when enabled. Fractional amount represents the leftover materials since the last workforce consumption event.', '基地库存；开启时还包括正在飞来的船上的货物。小数部分是上次工人消耗之后剩下的零头。')
R(B+'BURN.vue', '''              Inv
              <Tooltip
                position="right"
                tooltip="Stock at the base plus cargo on inbound ships when enabled. Fractional amount
                 represents the leftover materials since the last workforce consumption event." />''', '''              {{ t('burn.col.inv') }}
              <Tooltip position="right" :tooltip="t('burn.col.invTip')" />''')
for k, en, zh in [('in','In','消耗'),('out','Out','产出'),('net','Net','净值'),('days','Days','天数'),('cmd','CMD','命令')]:
    E(f'burn.col.{k}', en, zh)
    R(B+'BURN.vue', f'<th>{en}</th>', f"<th>{{{{ t('burn.col.{k}') }}}}</th>")
E('burn.col.burn', 'Burn', '日耗')
E('burn.col.burnTip', 'How much of a material is consumed per day.', '这种物资每天消耗多少。')
R(B+'BURN.vue', '''              Burn
              <Tooltip position="bottom" tooltip="How much of a material is consumed per day." />''', '''              {{ t('burn.col.burn') }}
              <Tooltip position="bottom" :tooltip="t('burn.col.burnTip')" />''')
E('burn.col.need', 'Need', '需补')
E('burn.col.needTip', 'How much of a material needs to be delivered to be fully supplied.', '要补满到目标天数，这种物资还需要运来多少。')
R(B+'BURN.vue', '''              Need
              <Tooltip
                position="bottom"
                tooltip="How much of a material needs to be delivered to be fully supplied." />''', '''              {{ t('burn.col.need') }}
              <Tooltip position="bottom" :tooltip="t('burn.col.needTip')" />''')

S('XIT BURN —— 其他')
E('burn.overall', 'Overall', '合计')
R(B+'BURN.vue', "planetName: 'Overall',", "planetName: t('burn.overall'),")
E('burn.inbound.included', 'Includes inbound cargo. Click to exclude it.', '已计入在途货物。点击排除。')
E('burn.inbound.excluded', 'Excludes inbound cargo. Click to include it.', '未计入在途货物。点击计入。')
R(B+'PlanetHeader.vue', "? 'Includes inbound cargo. Click to exclude it.'", "? t('burn.inbound.included')")
R(B+'PlanetHeader.vue', ": 'Excludes inbound cargo. Click to include it.',", ": t('burn.inbound.excluded'),")

S('XIT BURNACT（BURN 里每个基地的 ACT 按钮）')
E('burnact.description', 'Executes a resupply action package for a planet from the burn screen.', '在 BURN 界面为某个星球执行补给动作包。')
E('burnact.parameters', 'Planet Identifier', '星球编号')
R(B+'BURNACT.ts', "description: 'Executes a resupply action package for a planet from the burn screen.',", "description: t('burnact.description'),")
R(B+'BURNACT.ts', "mandatoryParameters: 'Planet Identifier',", "mandatoryParameters: t('burnact.parameters'),")
E('burnact.notFound', 'Planet "{0}" not found.', '找不到星球“{0}”。')
E('burnact.returnJson', 'Generate Return JSON', '生成返程 JSON')
E('burnact.returnJsonToggle', 'generate return json', '生成返程 json')
E('burnact.agent', 'Agent', '代理')
E('burnact.agentToggle', 'agent', '代理')
R(B+'BurnActWindow.vue', '<div v-if="!planetName">Planet "{{ naturalId }}" not found.</div>', "<div v-if=\"!planetName\">{{ t('burnact.notFound', naturalId) }}</div>")
R(B+'BurnActWindow.vue', '<Active label="Generate Return JSON">', "<Active :label=\"t('burnact.returnJson')\">")
R(B+'BurnActWindow.vue', '<RadioItem v-model="generateReturnJson">generate return json</RadioItem>', "<RadioItem v-model=\"generateReturnJson\">{{ t('burnact.returnJsonToggle') }}</RadioItem>")
R(B+'BurnActWindow.vue', '<Active label="Agent">', "<Active :label=\"t('burnact.agent')\">")
R(B+'BurnActWindow.vue', '<RadioItem v-model="agent">agent</RadioItem>', "<RadioItem v-model=\"agent\">{{ t('burnact.agentToggle') }}</RadioItem>")

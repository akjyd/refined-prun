from tr import S, E, R
D = 'src/features/XIT/FLT/'
F = D+'FLT.vue'

S('XIT FLT —— 命令')
f = D+'FLT.ts'
E('flt.description', 'Enhanced fleet table with detailed status, cargo, fuel, and quick actions.', '增强版舰队表：详细状态、货物、燃料和快捷操作。')
R(f, "description: 'Enhanced fleet table with detailed status, cargo, fuel, and quick actions.',", "description: t('flt.description'),")

S('XIT FLT —— 筛选面板')
E('flt.minimize', 'Minimize', '折叠')
R(F, "\n        Minimize\n", "\n        {{ t('flt.minimize') }}\n")
E('flt.active', '{0} active', '{0} 项生效')
R(F, "\n          {{ activeFilterCount }} active\n", "\n          {{ t('flt.active', activeFilterCount) }}\n")
E('flt.reset', 'reset', '重置')
R(F, "\n          reset\n", "\n          {{ t('flt.reset') }}\n")
for key, en, zh in [('shipList','Ship list','船型'),('flightState','Flight state','飞行状态'),('columns','Columns','显示列'),('resetTitle','Reset','重置'),('primarySort','Primary sort','主排序'),('secondarySort','Secondary sort','次排序'),('layout','Layout','布局'),('route','Route','航线'),('fuel','Fuel','燃料'),('problemFuel','Problematic fuel level','燃料告警线')]:
    E(f'flt.group.{key}', en, zh)
    R(F, f'<div :class="$style.filterTitle">{en}</div>', f"<div :class=\"$style.filterTitle\">{{{{ t('flt.group.{key}') }}}}</div>")
E('flt.inFlight', 'IN FLIGHT', '飞行中')
E('flt.docked', 'DOCKED', '停靠')
R(F, '<RadioItem v-model="showInFlightShips" horizontal>IN FLIGHT</RadioItem>', "<RadioItem v-model=\"showInFlightShips\" horizontal>{{ t('flt.inFlight') }}</RadioItem>")
R(F, '<RadioItem v-model="showNotInFlightShips" horizontal>DOCKED</RadioItem>', "<RadioItem v-model=\"showNotInFlightShips\" horizontal>{{ t('flt.docked') }}</RadioItem>")
# Filter groups: titles and option values. Values stay as data; only the labels change.
for key, en, zh in [('shipClass','Ship class','船级'),('etaBucket','ETA bucket','到达时间'),('inventorySize','Inventory size','货舱大小'),('cargoState','Cargo state','装载状态'),('condition','Condition','船况')]:
    E(f'flt.filter.{key}', en, zh)
    R(F, f"    title: '{en}',", f"    title: t('flt.filter.{key}'),")
R(F, "\n            {{ option }}\n          </RadioItem>", "\n            {{ tValue(option) }}\n          </RadioItem>")
for v, zh in [('DOCKED','停靠'),('EMPTY','空'),('PARTIAL','部分'),('FULL','满')]:
    E(f'value.{v}', v, zh)
for col, en, zh in [('Name','NAME','名称'),('ShipClass','CLASS','船级'),('Size','SIZE','大小'),('Cargo','CARGO','货物'),('CargoSize','CARGO/SIZE','货物/大小'),('Time','ETA','到达'),('Repair','REPAIR','维修'),('Fuel','FUEL','燃料'),('Problems','PROBLEMS','问题')]:
    E(f'flt.col.{col}', en, zh)
    R(F, f'<RadioItem v-model="showCol{col}" horizontal>{en}</RadioItem>', f"<RadioItem v-model=\"showCol{col}\" horizontal>{{{{ t('flt.col.{col}') }}}}</RadioItem>")
E('flt.resetAll', 'RESET ALL FILTERS', '重置全部筛选')
R(F, "\n            RESET ALL FILTERS\n", "\n            {{ t('flt.resetAll') }}\n")
# Sort keys are data; show them through a label map.
for k, zh in [('none','无'),('name','名称'),('shipClass','船级'),('cargo','货物'),('status','状态'),('eta','到达'),('repair','维修'),('size','大小'),('fuel','燃料')]:
    E(f'flt.sort.{k}', k.upper(), zh)
R(F, "const filterSymbol = computed(() => (showFilters.value ? '-' : '+'));", """const filterSymbol = computed(() => (showFilters.value ? '-' : '+'));

const sortLabels: Record<string, string> = {
  none: t('flt.sort.none'),
  name: t('flt.sort.name'),
  shipClass: t('flt.sort.shipClass'),
  cargo: t('flt.sort.cargo'),
  status: t('flt.sort.status'),
  eta: t('flt.sort.eta'),
  repair: t('flt.sort.repair'),
  size: t('flt.sort.size'),
  fuel: t('flt.sort.fuel'),
};""")
R(F, "\n            {{ key.toUpperCase() }}\n", "\n            {{ sortLabels[key] }}\n", 2)
for key, en, zh in [('compact','COMPACT','紧凑'),('whitespace','WHITESPACE','宽松'),('cargo','CARGO','货物'),('legacy','LEGACY','旧版')]:
    E(f'flt.layout.{key}', en, zh)
    R(F, f"@update:model-value=\"layoutMode = '{key}'\">\n            {en}\n", f"@update:model-value=\"layoutMode = '{key}'\">\n            {{{{ t('flt.layout.{key}') }}}}\n")
E('flt.hideCxReturns', 'HIDE CX RETURNS', '隐藏返回交易所的船')
R(F, '<RadioItem v-model="hideReturningToCx" horizontal>HIDE CX RETURNS</RadioItem>', "<RadioItem v-model=\"hideReturningToCx\" horizontal>{{ t('flt.hideCxReturns') }}</RadioItem>")

S('XIT FLT —— 表头')
for key, en, zh in [('name','Name','名称'),('class','Class','船级'),('size','Size','大小'),('cargo','Cargo','货物'),('cargoSize','Cargo/Size','货物/大小'),('status','Status','状态'),('eta','ETA','到达'),('repair','Repair','维修')]:
    E(f'flt.head.{key}', en, zh)
sort_for = {'name':'name','class':'shipClass','size':'size','cargo':'cargo','status':'status','eta':'eta','repair':'repair'}
for key, en in [('name','Name'),('class','Class'),('size','Size'),('status','Status'),('eta','ETA'),('repair','Repair')]:
    s = sort_for[key]
    R(F, f"@click=\"setSort('{s}')\">\n            {en}\n", f"@click=\"setSort('{s}')\">\n            {{{{ t('flt.head.{key}') }}}}\n")
R(F, "@click=\"setSort('cargo')\">\n            Cargo\n", "@click=\"setSort('cargo')\">\n            {{ t('flt.head.cargo') }}\n")
R(F, "@click=\"setSort('cargo')\">\n            Cargo/Size\n", "@click=\"setSort('cargo')\">\n            {{ t('flt.head.cargoSize') }}\n")
E('flt.head.problems', 'Problems', '问题')
R(F, "\n            Problems\n", "\n            {{ t('flt.head.problems') }}\n")
f = D+'FuelHeaderButton.vue'
E('flt.fuelButton', 'Fuel', '加油')
R(f, "@click.stop=\"emit('refuel')\"> Fuel </PrunButton>", "@click.stop=\"emit('refuel')\">\n      {{ t('flt.fuelButton') }}\n    </PrunButton>")
E('flt.openInventory', 'Open inventory', '打开库存')
E('flt.openFlightControl', 'Open flight control', '打开飞行控制')
for f in (D+'StatusCell.vue', D+'TimeCell.vue'):
    R(f, 'data-tooltip="Open inventory"', ":data-tooltip=\"t('flt.openInventory')\"")
    R(f, 'data-tooltip="Open flight control"', ":data-tooltip=\"t('flt.openFlightControl')\"")

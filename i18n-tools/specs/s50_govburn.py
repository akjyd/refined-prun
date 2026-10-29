from tr import S, E, R
D = 'src/features/XIT/GOVBURN/'

S('州长维护 —— 通用')
E('gov.period', '.', '。')
E('gov.noDataRun', 'No data for {0}. Run', '{0} 还没有数据。请运行')
E('gov.planetNotFound', 'Planet not found.', '找不到星球。')
E('gov.col.planet', 'Planet', '星球')
E('gov.col.building', 'Building', '建筑')
E('gov.col.days', 'Days', '天数')
E('gov.noDataTip', 'No data captured. Run XIT GOVBURNDATA.', '还没有收集到数据。请运行 XIT GOVBURNDATA。')

S('州长维护 —— 命令')
f = D+'GOVBURN.ts'
E('gov.title', 'GOVERNMENT BURN', '州长维护')
E('gov.titlePlanet', 'GOVERNMENT BURN - {0}', '州长维护 - {0}')
E('gov.description', 'Tracks planetary infrastructure upkeep.', '跟踪星球人口基础设施的维护物资。')
E('gov.parameters', 'Planet Identifier', '星球编号')
R(f, "return 'GOVERNMENT BURN';", "return t('gov.title');")
R(f, 'return `GOVERNMENT BURN - ${planet?.name ?? parameter}`;', "return t('gov.titlePlanet', planet?.name ?? parameter);")
R(f, "description: 'Tracks planetary infrastructure upkeep.',", "description: t('gov.description'),")
R(f, "optionalParameters: 'Planet Identifier',", "optionalParameters: t('gov.parameters'),")
f = D+'GOVBURNACT.ts'
E('gov.act.title', 'GOVBURN RESUPPLY', '州长维护补给')
E('gov.act.titlePlanet', 'GOVBURN RESUPPLY - {0}', '州长维护补给 - {0}')
E('gov.act.description', 'Executes a planetary upkeep resupply action package.', '执行星球维护物资的补给动作包。')
R(f, 'return `GOVBURN RESUPPLY - ${planet?.name ?? parameter}`;', "return t('gov.act.titlePlanet', planet?.name ?? parameter);")
R(f, "return 'GOVBURN RESUPPLY';", "return t('gov.act.title');")
R(f, "description: 'Executes a planetary upkeep resupply action package.',", "description: t('gov.act.description'),")
R(f, "mandatoryParameters: 'Planet Identifier',", "mandatoryParameters: t('gov.parameters'),")
f = D+'GOVBURNDATA.ts'
E('gov.data.title', 'GOVBURN DATA', '州长维护数据')
E('gov.data.titlePlanet', 'GOVBURN DATA - {0}', '州长维护数据 - {0}')
E('gov.data.description', 'Collects planetary infrastructure upkeep data via POPI/POPID buffers.', '通过 POPI / POPID 窗口收集人口基础设施的维护数据。')
R(f, 'return `GOVBURN DATA - ${planet?.name ?? parameter}`;', "return t('gov.data.titlePlanet', planet?.name ?? parameter);")
R(f, "return 'GOVBURN DATA';", "return t('gov.data.title');")
R(f, "description: 'Collects planetary infrastructure upkeep data via POPI/POPID buffers.',", "description: t('gov.data.description'),")
R(f, "optionalParameters: 'Planet Identifier',", "optionalParameters: t('gov.parameters'),")
f = D+'GOVBURNEXEC.ts'
E('gov.exec.title', 'GOVBURN EXECUTE', '州长维护执行')
E('gov.exec.description', 'Executes the staged planetary upkeep resupply action package.', '执行已准备好的星球维护补给动作包。')
R(f, "name: 'GOVBURN EXECUTE',", "name: t('gov.exec.title'),")
R(f, "description: 'Executes the staged planetary upkeep resupply action package.',", "description: t('gov.exec.description'),")
f = D+'GovBurnExecWindow.vue'
E('gov.exec.nothing', 'Nothing staged. Open XIT GOVBURNACT and press EXECUTE.', '还没有准备好的动作包。请打开 XIT GOVBURNACT 并按「执行」。')
R(f, '<div v-if="!pkg">Nothing staged. Open XIT GOVBURNACT and press EXECUTE.</div>', "<div v-if=\"!pkg\">{{ t('gov.exec.nothing') }}</div>")

S('州长维护 —— 总览')
f = D+'GovBurnOverview.vue'
E('gov.ov.config', 'CONFIG', '设置')
E('gov.ov.data', 'DATA', '数据')
E('gov.ov.empty', 'No planets configured.', '还没有添加星球。')
E('gov.ov.noCogcTip', 'No COGC data captured. Run XIT GOVBURNDATA.', '还没有收集到 COGC 数据。请运行 XIT GOVBURNDATA。')
E('gov.ov.cmd', 'CMD', '命令')
R(f, '@click="showConfig = true">CONFIG</PrunButton>', "@click=\"showConfig = true\">{{ t('gov.ov.config') }}</PrunButton>")
R(f, '''@click="showBuffer('XIT GOVBURNDATA')">DATA</PrunButton>''', '''@click="showBuffer('XIT GOVBURNDATA')">{{ t('gov.ov.data') }}</PrunButton>''')
R(f, ':class="$style.empty">No planets configured.</p>', ":class=\"$style.empty\">{{ t('gov.ov.empty') }}</p>")
R(f, '<th>Planet</th>', "<th>{{ t('gov.col.planet') }}</th>")
R(f, '<th>CMD</th>', "<th>{{ t('gov.ov.cmd') }}</th>")
R(f, '<span data-tooltip="No data captured. Run XIT GOVBURNDATA.">--</span>', "<span :data-tooltip=\"t('gov.noDataTip')\">--</span>")
R(f, '<span data-tooltip="No COGC data captured. Run XIT GOVBURNDATA.">--</span>', "<span :data-tooltip=\"t('gov.ov.noCogcTip')\">--</span>")
R(f, '@click="onActClick(row.naturalId)">ACT</PrunButton>', "@click=\"onActClick(row.naturalId)\">{{ t('act.exec.act') }}</PrunButton>")

S('州长维护 —— 单个星球')
f = D+'GovBurnPlanetView.vue'
R(f, '''    <p>
      No data for {{ displayName }}. Run
      <PrunLink''', '''    <p>
      {{ t('gov.noDataRun', displayName) }}
      <PrunLink''')
R(f, '''      </PrunLink>
      .
    </p>''', '''      </PrunLink>
      {{ t('gov.period') }}
    </p>''')
E('gov.pv.required', 'Required', '需要数量')
E('gov.pv.level', '{0} Lvl {1}', '{0} {1} 级')
R(f, '<th>Building</th>', "<th>{{ t('gov.col.building') }}</th>")
R(f, '<th>Required</th>', "<th>{{ t('gov.pv.required') }}</th>")
R(f, '<th>Days</th>', "<th>{{ t('gov.col.days') }}</th>")
R(f, '<template v-else>{{ row.ticker }} Lvl {{ row.level }}</template>', "<template v-else>{{ t('gov.pv.level', row.ticker, row.level) }}</template>")
R(f, '<span data-tooltip="No data captured. Run XIT GOVBURNDATA.">--</span>', "<span :data-tooltip=\"t('gov.noDataTip')\">--</span>")

S('州长维护 —— 补给窗口（GOVBURNACT）')
f = D+'GovBurnActWindow.vue'
E('gov.act.header', 'GovBurn Resupply {0}', '州长维护补给 {0}')
R(f, '<Header :class="$style.header">GovBurn Resupply {{ displayName }}</Header>', "<Header :class=\"$style.header\">{{ t('gov.act.header', displayName) }}</Header>")
R(f, '''      <p>
        No data for {{ displayName }}. Run
        <PrunLink''', '''      <p>
        {{ t('gov.noDataRun', displayName) }}
        <PrunLink''')
E('gov.act.noBuildings', 'No buildings configured for {0}. Configure them in', '{0} 还没有设置建筑。请在这里设置：')
R(f, 'No buildings configured for {{ displayName }}. Configure them in', "{{ t('gov.act.noBuildings', displayName) }}")
R(f, '''        </PrunLink>
        .
      </p>''', '''        </PrunLink>
        {{ t('gov.period') }}
      </p>''')
R(f, '''XIT GOVBURN</PrunLink>
        .
      </p>''', '''XIT GOVBURN</PrunLink>
        {{ t('gov.period') }}
      </p>''')
R(f, '''          </PrunLink>
          .
        </p>''', '''          </PrunLink>
          {{ t('gov.period') }}
        </p>''')
E('gov.act.missing', 'Missing upkeep data. Run', '缺少维护数据。请运行')
R(f, '          Missing upkeep data. Run\n', "          {{ t('gov.act.missing') }}\n")
R(f, '<Active label="Days">', "<Active :label=\"t('gov.col.days')\">")
R(f, '<th>Building</th>', "<th>{{ t('gov.col.building') }}</th>")
E('gov.act.slot', 'Slot {0}', '槽位 {0}')
R(f, ':key="i">Slot {{ i }}</th>', ":key=\"i\">{{ t('gov.act.slot', i) }}</th>")
E('gov.act.noData', 'no data', '无数据')
R(f, ':class="$style.noData">no data</td>', ":class=\"$style.noData\">{{ t('gov.act.noData') }}</td>")
E('gov.act.cogc', 'COGC: {0} refill(s) included', 'COGC：已包含 {0} 次补充')
R(f, 'COGC: {{ cogcRefills(horizonDays) }} refill(s) included', "{{ t('gov.act.cogc', cogcRefills(horizonDays)) }}")
E('gov.act.covered', 'Reserves already cover {0} days - nothing to buy.', '现有储备已够 {0} 天，不需要购买。')
R(f, 'Reserves already cover {{ horizonDays }} days - nothing to buy.', "{{ t('gov.act.covered', horizonDays) }}")
E('gov.act.resolve', 'Resolve all upkeep slots to continue.', '请先选定所有维护槽位的物资。')
R(f, ':class="$style.summary">Resolve all upkeep slots to continue.</p>', ":class=\"$style.summary\">{{ t('gov.act.resolve') }}</p>")
R(f, "\n          EXECUTE\n", "\n          {{ t('act.common.execute') }}\n")
E('gov.act.bill', 'Bill: {0} ({1}t, {2}m³)', '清单：{0}（{1} 吨，{2} 立方米）')
R(f, 'return `Bill: ${parts} (${fixed02(totals.weight)}t, ${fixed02(totals.volume)}m³)`;', "return t('gov.act.bill', parts, fixed02(totals.weight), fixed02(totals.volume));")

S('州长维护 —— 设置')
f = D+'GovBurnConfig.vue'
E('gov.cfg.done', 'DONE', '完成')
E('gov.cfg.thresholds', 'Thresholds', '变色阈值')
E('gov.cfg.red', 'Red (days)', '红色（天）')
E('gov.cfg.yellow', 'Yellow (days)', '黄色（天）')
E('gov.cfg.addPlanet', 'Add Planet', '添加星球')
E('gov.cfg.remove', 'REMOVE', '移除')
R(f, '@click="showImport = true">IMPORT</PrunButton>', "@click=\"showImport = true\">{{ t('act.common.import') }}</PrunButton>")
R(f, '''@click="emit('done')">DONE</PrunButton>''', '''@click="emit('done')">{{ t('gov.cfg.done') }}</PrunButton>''')
R(f, '<SectionHeader>Thresholds</SectionHeader>', "<SectionHeader>{{ t('gov.cfg.thresholds') }}</SectionHeader>")
R(f, '<Active label="Red (days)">', "<Active :label=\"t('gov.cfg.red')\">")
R(f, '<Active label="Yellow (days)">', "<Active :label=\"t('gov.cfg.yellow')\">")
R(f, '<SectionHeader>Add Planet</SectionHeader>', "<SectionHeader>{{ t('gov.cfg.addPlanet') }}</SectionHeader>")
R(f, '<Active label="Planet" :error="planetError">', "<Active :label=\"t('gov.col.planet')\" :error=\"planetError\">")
R(f, '@click="addPlanet">ADD</PrunButton>', "@click=\"addPlanet\">{{ t('act.common.add') }}</PrunButton>")
R(f, ':class="$style.error">Planet not found.</p>', ":class=\"$style.error\">{{ t('gov.planetNotFound') }}</p>")
R(f, '<th>Planet</th>', "<th>{{ t('gov.col.planet') }}</th>")
R(f, '@click="removePlanet(naturalId)">REMOVE</PrunButton>', "@click=\"removePlanet(naturalId)\">{{ t('gov.cfg.remove') }}</PrunButton>")

S('州长维护 —— 导入方案')
f = D+'GovBurnImport.vue'
E('gov.imp.title', 'Import GovBurn Plan', '导入州长维护方案')
R(f, '<SectionHeader>Import GovBurn Plan</SectionHeader>', "<SectionHeader>{{ t('gov.imp.title') }}</SectionHeader>")
R(f, '<Active label="Type">', "<Active :label=\"t('act.common.type')\">")
R(f, "{ label: 'Paste JSON', value: 'TEXT' },", "{ label: t('act.import.paste'), value: 'TEXT' },")
R(f, "{ label: 'Upload JSON', value: 'FILE' },", "{ label: t('act.import.upload'), value: 'FILE' },")
R(f, '@click="onUploadClick">UPLOAD</PrunButton>', "@click=\"onUploadClick\">{{ t('act.import.uploadButton') }}</PrunButton>")
R(f, '@click="onPreviewClick">PREVIEW</PrunButton>', "@click=\"onPreviewClick\">{{ t('act.exec.preview') }}</PrunButton>")
R(f, '''<PrunButton @click="emit('done')">CANCEL</PrunButton>''', '''<PrunButton @click="emit('done')">{{ t('act.exec.cancel') }}</PrunButton>''')
E('gov.imp.overwrites', 'Overwrites existing settings for the highlighted rows.', '高亮的行会覆盖现有设置。')
R(f, '\n      Overwrites existing settings for the highlighted rows.\n', "\n      {{ t('gov.imp.overwrites') }}\n")
E('gov.imp.noData', 'No data captured for this planet. Materials cannot be validated - run XIT GOVBURNDATA.', '这个星球还没有收集到数据，无法核对物资。请运行 XIT GOVBURNDATA。')
R(f, '\n      No data captured for this planet. Materials cannot be validated - run XIT GOVBURNDATA.\n', "\n      {{ t('gov.imp.noData') }}\n")
E('gov.imp.ignored', 'Ignored (not POPI buildings): {0}.', '已忽略（不是人口基础设施建筑）：{0}。')
R(f, "\n      Ignored (not POPI buildings): {{ plan.ignored.join(', ') }}.\n", "\n      {{ t('gov.imp.ignored', plan.ignored.join(', ')) }}\n")
E('gov.imp.current', 'Current', '当前')
E('gov.imp.new', 'New', '导入后')
E('gov.imp.note', 'Note', '备注')
R(f, '<th>Building</th>', "<th>{{ t('gov.col.building') }}</th>")
R(f, '<th>Current</th>', "<th>{{ t('gov.imp.current') }}</th>")
R(f, '<th>New</th>', "<th>{{ t('gov.imp.new') }}</th>")
R(f, '<th>Note</th>', "<th>{{ t('gov.imp.note') }}</th>")
E('gov.imp.confirm', 'CONFIRM', '确认')
E('gov.imp.back', 'BACK', '返回')
R(f, '@click="onConfirm">CONFIRM</PrunButton>', "@click=\"onConfirm\">{{ t('gov.imp.confirm') }}</PrunButton>")
R(f, '<PrunButton @click="onBack">BACK</PrunButton>', "<PrunButton @click=\"onBack\">{{ t('gov.imp.back') }}</PrunButton>")
E('gov.imp.notInImport', 'not in import', '导入里没有')
E('gov.imp.clamped', 'clamped to {0} upkeeps', '已限制为 {0} 个维护物资')
E('gov.imp.notUpkeep', 'not an upkeep: {0}', '不是维护物资：{0}')
R(f, "notes.push('not in import');", "notes.push(t('gov.imp.notInImport'));")
R(f, 'notes.push(`clamped to ${row.count} upkeeps`);', "notes.push(t('gov.imp.clamped', row.count));")
R(f, "notes.push(`not an upkeep: ${row.unknownMaterials.join(', ')}`);", "notes.push(t('gov.imp.notUpkeep', row.unknownMaterials.join(', ')));")
E('gov.imp.invalidJson', 'Invalid JSON.', 'JSON 格式无效。')
R(f, "errorMessage.value = 'Invalid JSON.';", "errorMessage.value = t('gov.imp.invalidJson');", 3)
R(f, "errorMessage.value = 'Planet not found.';", "errorMessage.value = t('gov.planetNotFound');")

f = D+'utils.ts'
E('gov.unresolvedSlot', 'Unresolved gov burn slot for {0}', '{0} 还有没选定物资的维护槽位')
R(f, 'throw new Error(`Unresolved gov burn slot for ${building.ticker}`);', "throw new Error(t('gov.unresolvedSlot', building.ticker));")

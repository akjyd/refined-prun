from tr import S, E, R
A = 'src/features/XIT/ACT/'

S('XIT ACT —— 命令')
E('act.title.list', 'ACTION PACKAGES', '动作包')
E('act.title.edit', 'EDIT ACTION PACKAGE', '编辑动作包')
E('act.title.execute', 'EXECUTE ACTION PACKAGE', '执行动作包')
E('act.description', 'Allows to automate certain tasks.', '把一些操作自动化。')
E('act.parameters', 'GEN and/or Action Name', 'GEN 和/或 动作包名')
R(A+'ACT.ts', "return 'ACTION PACKAGES';", "return t('act.title.list');")
R(A+'ACT.ts', "return 'EDIT ACTION PACKAGE';", "return t('act.title.edit');")
R(A+'ACT.ts', "return 'EXECUTE ACTION PACKAGE';", "return t('act.title.execute');")
R(A+'ACT.ts', "description: 'Allows to automate certain tasks.',", "description: t('act.description'),")
R(A+'ACT.ts', "optionalParameters: 'GEN and/or Action Name',", "optionalParameters: t('act.parameters'),")
E('act.pkgNotFound', 'Action package "{0}" not found.', '找不到动作包“{0}”。')
R(A+'ACT.vue', '<div v-else-if="!pkg">Action package "{{ pkgName }}" not found.</div>', "<div v-else-if=\"!pkg\">{{ t('act.pkgNotFound', pkgName ?? '') }}</div>")

S('XIT ACT —— 通用')
E('act.common.name', 'Name', '名称')
E('act.common.type', 'Type', '类型')
E('act.common.description', 'Description', '说明')
E('act.common.content', 'Content', '内容')
E('act.common.delete', 'DELETE', '删除')
E('act.common.deleteSmall', 'delete', '删除')
E('act.common.editSmall', 'edit', '编辑')
E('act.common.add', 'ADD', '添加')
E('act.common.save', 'SAVE', '保存')
E('act.common.create', 'CREATE', '创建')
E('act.common.execute', 'EXECUTE', '执行')
E('act.common.edit', 'EDIT', '编辑')
E('act.common.import', 'IMPORT', '导入')
E('act.common.rename', 'RENAME', '重命名')

S('XIT ACT —— 动作包列表')
L = A+'ActionPackageList.vue'
E('act.list.quickstartHint1', "Click here if you don't", '不知道怎么用？')
E('act.list.quickstartHint2', 'know what to do!', '点这里！')
R(L, '<div v-if="showQuickstart">Click here if you don\'t<br />know what to do!</div>', "<div v-if=\"showQuickstart\">{{ t('act.list.quickstartHint1') }}<br />{{ t('act.list.quickstartHint2') }}</div>")
E('act.list.quickstart', 'QUICKSTART', '快速开始')
R(L, '@click="onQuickstartClick">QUICKSTART</PrunButton>', "@click=\"onQuickstartClick\">{{ t('act.list.quickstart') }}</PrunButton>")
E('act.list.createNew', 'CREATE NEW', '新建')
R(L, '@click="onCreateClick">CREATE NEW</PrunButton>', "@click=\"onCreateClick\">{{ t('act.list.createNew') }}</PrunButton>")
R(L, '@click="onImportClick">IMPORT</PrunButton>', "@click=\"onImportClick\">{{ t('act.common.import') }}</PrunButton>")
R(L, '<th>Name</th>', "<th>{{ t('act.common.name') }}</th>")
E('act.list.colExecute', 'Execute', '执行')
E('act.list.colEdit', 'Edit', '编辑')
E('act.list.colDelete', 'Delete', '删除')
R(L, '<th>Execute</th>', "<th>{{ t('act.list.colExecute') }}</th>")
R(L, '<th>Edit</th>', "<th>{{ t('act.list.colEdit') }}</th>")
R(L, '<th>Delete</th>', "<th>{{ t('act.list.colDelete') }}</th>")
E('act.list.empty', 'No action packages.', '还没有动作包。')
R(L, '<td colspan="5">No action packages.</td>', "<td colspan=\"5\">{{ t('act.list.empty') }}</td>")
R(L, "\n            EXECUTE\n", "\n            {{ t('act.common.execute') }}\n")
R(L, "\n            EDIT\n", "\n            {{ t('act.common.edit') }}\n")
R(L, '@click="onDeleteClick($event, pkg)">delete</PrunButton>', "@click=\"onDeleteClick($event, pkg)\">{{ t('act.common.deleteSmall') }}</PrunButton>")
E('act.list.confirmDelete', 'Are you sure you want to delete the action package "{0}"?', '确定要删除动作包“{0}”吗？')
R(L, 'message: `Are you sure you want to delete the action package "${pkg.global.name}"?`,', "message: t('act.list.confirmDelete', pkg.global.name),")
R(L, "confirmLabel: 'DELETE',", "confirmLabel: t('act.common.delete'),")

S('XIT ACT —— 新建 / 重命名 / 导入')
E('act.create.title', 'Create Action Package', '新建动作包')
R(A+'CreateActionPackage.vue', '<SectionHeader>Create Action Package</SectionHeader>', "<SectionHeader>{{ t('act.create.title') }}</SectionHeader>")
R(A+'CreateActionPackage.vue', '<Active label="Name" :error="nameError">', "<Active :label=\"t('act.common.name')\" :error=\"nameError\">")
R(A+'CreateActionPackage.vue', '@click="onCreateClick">CREATE</PrunButton>', "@click=\"onCreateClick\">{{ t('act.common.create') }}</PrunButton>")
E('act.rename.title', 'Rename Action Package', '重命名动作包')
E('act.rename.warning', 'WARNING: Renaming an action package will break all existing tile links to it (including this one). You can see the full list of your action packages in XIT ACT.', '警告：重命名后，所有指向这个动作包的窗口链接都会失效（包括当前这个）。完整的动作包列表可以在 XIT ACT 里看到。')
RN = A+'RenameActionPackage.vue'
R(RN, '<SectionHeader>Rename Action Package</SectionHeader>', "<SectionHeader>{{ t('act.rename.title') }}</SectionHeader>")
R(RN, '''    <SectionDescription>
      WARNING: Renaming an action package will break all existing tile links to it (including this
      one). You can see the full list of your action packages in XIT ACT.
    </SectionDescription>''', '''    <SectionDescription>
      {{ t('act.rename.warning') }}
    </SectionDescription>''')
R(RN, '<Active label="Name" :error="nameError">', "<Active :label=\"t('act.common.name')\" :error=\"nameError\">")
R(RN, '@click="onCreateClick">RENAME</PrunButton>', "@click=\"onCreateClick\">{{ t('act.common.rename') }}</PrunButton>")
E('act.import.title', 'Import Action Package', '导入动作包')
E('act.import.paste', 'Paste JSON', '粘贴 JSON')
E('act.import.upload', 'Upload JSON', '上传 JSON 文件')
E('act.import.uploadButton', 'UPLOAD', '上传')
IM = A+'ImportActionPackage.vue'
R(IM, "label: 'Paste JSON',", "label: t('act.import.paste'),")
R(IM, "label: 'Upload JSON',", "label: t('act.import.upload'),")
R(IM, '<SectionHeader>Import Action Package</SectionHeader>', "<SectionHeader>{{ t('act.import.title') }}</SectionHeader>")
R(IM, '<Active label="Type">', "<Active :label=\"t('act.common.type')\">")
R(IM, '@click="onUploadClick">UPLOAD</PrunButton>', "@click=\"onUploadClick\">{{ t('act.import.uploadButton') }}</PrunButton>")
R(IM, '@click="onImportClick">IMPORT</PrunButton>', "@click=\"onImportClick\">{{ t('act.common.import') }}</PrunButton>")

S('XIT ACT —— 编辑动作包')
EP = A+'EditActionPackage.vue'
E('act.edit.confirmDeleteGroup', 'Are you sure you want to delete the material group "{0}"?', '确定要删除物资组“{0}”吗？')
E('act.edit.confirmDeleteAction', 'Are you sure you want to delete the action "{0}"?', '确定要删除动作“{0}”吗？')
R(EP, 'message: `Are you sure you want to delete the material group "${group.name ?? \'--\'}"?`,', "message: t('act.edit.confirmDeleteGroup', group.name ?? '--'),")
R(EP, 'message: `Are you sure you want to delete the action "${action.name ?? \'--\'}"?`,', "message: t('act.edit.confirmDeleteAction', action.name ?? '--'),")
R(EP, "confirmLabel: 'DELETE',", "confirmLabel: t('act.common.delete'),", 2)
E('act.edit.invalidName', 'Invalid action package name. Use only letters, numbers, spaces, periods, and hyphens.', '动作包名无效。只能使用英文字母、数字、空格、点和横线。')
R(EP, ": 'Invalid action package name. Use only letters, numbers, spaces, periods, and hyphens.';", ": t('act.edit.invalidName');")
E('act.edit.groups', 'Material Groups', '物资组')
E('act.edit.actions', 'Actions', '动作')
E('act.edit.commands', 'Commands', '命令')
R(EP, '<SectionHeader>Material Groups</SectionHeader>', "<SectionHeader>{{ t('act.edit.groups') }}</SectionHeader>")
R(EP, '<SectionHeader>Actions</SectionHeader>', "<SectionHeader>{{ t('act.edit.actions') }}</SectionHeader>")
R(EP, '<SectionHeader>Commands</SectionHeader>', "<SectionHeader>{{ t('act.edit.commands') }}</SectionHeader>")
R(EP, '<th>Type</th>', "<th>{{ t('act.common.type') }}</th>", 2)
R(EP, '<th>Name</th>', "<th>{{ t('act.common.name') }}</th>", 2)
R(EP, '<th>Content</th>', "<th>{{ t('act.common.content') }}</th>", 2)
E('act.edit.noGroups', 'No groups yet.', '还没有物资组。')
E('act.edit.noActions', 'No actions yet.', '还没有动作。')
R(EP, '>No groups yet.</td>', ">{{ t('act.edit.noGroups') }}</td>")
R(EP, '>No actions yet.</td>', ">{{ t('act.edit.noActions') }}</td>")
R(EP, '<td>{{ group.type }}</td>', '<td>{{ tType(group.type) }}</td>')
R(EP, '<td>{{ action.type }}</td>', '<td>{{ tType(action.type) }}</td>')
R(EP, "\n            edit\n", "\n            {{ t('act.common.editSmall') }}\n")
R(EP, "\n            delete\n", "\n            {{ t('act.common.deleteSmall') }}\n")
R(EP, '@click="onEditActionClick($event, action)">edit</PrunButton>', "@click=\"onEditActionClick($event, action)\">{{ t('act.common.editSmall') }}</PrunButton>")
R(EP, '@click="onDeleteActionClick($event, action)">delete</PrunButton>', "@click=\"onDeleteActionClick($event, action)\">{{ t('act.common.deleteSmall') }}</PrunButton>")
R(EP, '@click="onAddMaterialGroupClick">ADD</PrunButton>', "@click=\"onAddMaterialGroupClick\">{{ t('act.common.add') }}</PrunButton>")
R(EP, '@click="onAddActionClick">ADD</PrunButton>', "@click=\"onAddActionClick\">{{ t('act.common.add') }}</PrunButton>")
E('act.edit.rename', 'Rename', '重命名')
E('act.edit.execute', 'Execute', '执行')
E('act.edit.export', 'Export', '导出')
E('act.edit.exportButton', 'EXPORT', '导出')
R(EP, '<Commands label="Rename">', "<Commands :label=\"t('act.edit.rename')\">")
R(EP, '<Commands label="Execute">', "<Commands :label=\"t('act.edit.execute')\">")
R(EP, '<Commands label="Export">', "<Commands :label=\"t('act.edit.export')\">")
R(EP, '@click="onRenameClick">RENAME</PrunButton>', "@click=\"onRenameClick\">{{ t('act.common.rename') }}</PrunButton>")
R(EP, '@click="onExecuteClick">EXECUTE</PrunButton>', "@click=\"onExecuteClick\">{{ t('act.common.execute') }}</PrunButton>")
R(EP, '@click="onExportClick">EXPORT</PrunButton>', "@click=\"onExportClick\">{{ t('act.edit.exportButton') }}</PrunButton>")

S('XIT ACT —— 添加 / 编辑动作和物资组')
E('act.edit.addAction', 'Add Action', '添加动作')
E('act.edit.editAction', 'Edit Action', '编辑动作')
E('act.edit.addGroup', 'Add Material Group', '添加物资组')
E('act.edit.editGroup', 'Edit Material Group', '编辑物资组')
for f, kind in [('EditAction.vue', 'Action'), ('EditMaterialGroup.vue', 'Material Group')]:
    k = 'Action' if kind == 'Action' else 'Group'
    R(A+f, f"<SectionHeader>{{{{ add ? 'Add' : 'Edit' }}}} {kind}</SectionHeader>", f"<SectionHeader>{{{{ add ? t('act.edit.add{k}') : t('act.edit.edit{k}') }}}}</SectionHeader>")
    R(A+f, '<Active label="Type">', "<Active :label=\"t('act.common.type')\">")
    R(A+f, '<Passive v-if="shortDescription" label="Description">', "<Passive v-if=\"shortDescription\" :label=\"t('act.common.description')\">")
    R(A+f, '<Active label="Name" :error="nameError">', "<Active :label=\"t('act.common.name')\" :error=\"nameError\">")
    R(A+f, "{{ add ? 'ADD' : 'SAVE' }}", "{{ add ? t('act.common.add') : t('act.common.save') }}")
R(A+'EditAction.vue', 'const typeOptions = act.getActionTypes();', 'const typeOptions = act.getActionTypes().map(x => ({ label: tType(x), value: x }));')
R(A+'EditMaterialGroup.vue', 'const typeOptions = act.getMaterialGroupTypes();', 'const typeOptions = act.getMaterialGroupTypes().map(x => ({ label: tType(x), value: x }));')

S('数据类型名（只用于显示「中文（英文）」，类型名本身不变）')
for ty, zh in [('CX Buy','交易所购买'),('MTRA','物资转运'),('Refuel','加油'),('CONT Ship','合同运输'),('CONT Trade','合同交易'),('GovBurn Data','州长维护数据'),
               ('Manual','手动'),('Resupply','补给'),('Repair','维修'),('Paste','粘贴')]:
    E(f'type.{ty}', ty, zh)

S('XIT ACT —— 执行窗口')
EX = A+'ExecuteActionPackage.vue'
E('act.exec.status', 'Status: ', '状态：')
E('act.exec.configureHint', 'Configure group parameters ↑', '请先在上方设置参数 ↑')
E('act.exec.pressExecute', 'Press Execute to start', '按「执行」开始')
R(EX, '<span>Status: </span>', "<span>{{ t('act.exec.status') }}</span>")
R(EX, '>Configure group parameters ↑</span>', ">{{ t('act.exec.configureHint') }}</span>")
R(EX, '>Press Execute to start</span>', ">{{ t('act.exec.pressExecute') }}</span>")
for key, en, zh in [('apply','APPLY','应用'),('configure','CONFIGURE','设置'),('preview','PREVIEW','预览'),('cancel','CANCEL','取消'),('act','ACT','操作'),('skip','SKIP','跳过')]:
    E(f'act.exec.{key}', en, zh)
R(EX, "\n          APPLY\n", "\n          {{ t('act.exec.apply') }}\n")
R(EX, '>CONFIGURE</PrunButton>', ">{{ t('act.exec.configure') }}</PrunButton>", 3)
R(EX, '>PREVIEW</PrunButton>', ">{{ t('act.exec.preview') }}</PrunButton>", 3)
R(EX, '<PrunButton disabled>EXECUTE</PrunButton>', "<PrunButton disabled>{{ t('act.common.execute') }}</PrunButton>")
R(EX, "\n          EXECUTE\n", "\n          {{ t('act.common.execute') }}\n")
R(EX, "\n          CANCEL\n", "\n          {{ t('act.exec.cancel') }}\n")
R(EX, '@click="onActClick">ACT</PrunButton>', "@click=\"onActClick\">{{ t('act.exec.act') }}</PrunButton>")
R(EX, "\n          SKIP\n", "\n          {{ t('act.exec.skip') }}\n")

S('XIT ACT —— 设置窗口 / 日志标签')
CF = A+'ConfigureWindow.vue'
E('act.config.groupBlock', '[{0}]: {1} Material Group', '[{0}]：{1} 物资组')
E('act.config.actionBlock', '[{0}]: {1} Action', '[{0}]：{1} 动作')
R(CF, 'name: `[${name}]: ${info.type} Material Group`,', "name: t('act.config.groupBlock', name, tType(info.type)),")
R(CF, 'name: `[${name}]: ${info.type} Action`,', "name: t('act.config.actionBlock', name, tType(info.type)),")
LW = A+'LogWindow.vue'
for tag, zh in [('INFO','信息'),('ACTION','操作'),('SUCCESS','成功'),('ERROR','错误'),('SKIP','跳过'),('WARNING','警告'),('CANCEL','取消')]:
    E(f'act.tag.{tag}', tag, zh)
R(LW, '''function getTagClass(tag: LogTag) {''', '''const tagLabels: Record<NonNullable<LogTag>, string> = {
  INFO: t('act.tag.INFO'),
  ACTION: t('act.tag.ACTION'),
  SUCCESS: t('act.tag.SUCCESS'),
  ERROR: t('act.tag.ERROR'),
  SKIP: t('act.tag.SKIP'),
  WARNING: t('act.tag.WARNING'),
  CANCEL: t('act.tag.CANCEL'),
};

function getTagClass(tag: LogTag) {''')
R(LW, '{{ message.tag }}: </b>', '{{ tagLabels[message.tag] }}：</b>')

S('XIT ACT —— 快速开始')
Q = A+'Quickstart.vue'
E('act.quick.title', 'Quickstart', '快速开始')
E('act.quick.desc1', 'This prefilled action package will resupply your base with materials for a given number of days.', '这个预先填好的动作包会给你的基地补给指定天数的物资。')
E('act.quick.desc2', 'The created action package will have two actions: buy missing materials from the CX, then transfer them to the configured (next step) ship.', '它包含两个动作：先从交易所（CX）买齐缺少的物资，再转运到你指定的船上（下一步设置）。')
E('act.quick.desc3', 'After clicking "Create", you will be taken to the action package runner. Once there, first configure the target ship, then press "Execute" and press "Act" until the package is done.', '点「创建」后会打开执行窗口。在那里先选好目标船，然后按「执行」，再反复按「操作」直到全部完成。')
E('act.quick.note', 'Note: You need a ship parked at the selected CX for this to work.', '注意：必须有一艘船停在所选的交易所。')
R(Q, '<SectionHeader>Quickstart</SectionHeader>', "<SectionHeader>{{ t('act.quick.title') }}</SectionHeader>")
R(Q, '''      This prefilled action package will resupply your base with materials for a given number of
      days.
      <br />
      The created action package will have two actions: buy missing materials from the CX, then
      transfer them to the configured (next step) ship.
      <br />
      After clicking "Create", you will be taken to the action package runner. Once there, first
      configure the target ship, then press "Execute" and press "Act" until the package is done.
      <br />
      <mark>Note: You need a ship parked at the selected CX for this to work.</mark>''', '''      {{ t('act.quick.desc1') }}
      <br />
      {{ t('act.quick.desc2') }}
      <br />
      {{ t('act.quick.desc3') }}
      <br />
      <mark>{{ t('act.quick.note') }}</mark>''')
R(Q, '<Active label="Name">', "<Active :label=\"t('act.common.name')\">")
E('act.quick.cx', 'CX to Resupply From', '从哪个交易所买')
E('act.quick.planet', 'Planet to Resupply', '补给哪个星球')
E('act.quick.days', 'Resupply Days', '补给天数')
R(Q, '<Active label="CX to Resupply From">', "<Active :label=\"t('act.quick.cx')\">")
R(Q, '<Active label="Planet to Resupply">', "<Active :label=\"t('act.quick.planet')\">")
R(Q, '<Active label="Resupply Days">', "<Active :label=\"t('act.quick.days')\">")
R(Q, '@click="onCreateClick">CREATE</PrunButton>', "@click=\"onCreateClick\">{{ t('act.common.create') }}</PrunButton>")

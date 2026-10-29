from tr import S, E, R
D = 'src/features/XIT/ACT/action-steps/'
CT, CS, CU = D+'CONT_TRADE.ts', D+'CONT_SEND.ts', D+'cont-utils.ts'

S('XIT ACT —— 步骤：合同（只翻日志和提示；合同名、合同说明会填进游戏给对方看，保持英文）')
E('act.cont.buy', 'Buy', '购买')
E('act.cont.sell', 'Sell', '出售')
E('act.cont.tradeDraft', 'Create {0} contract draft ({1} materials)', '创建{0}合同草稿（{1} 种物资）')
R(CT, '''    const typeLabel = data.tradeType === 'BUYING' ? 'Buy' : 'Sell';
    return `Create ${typeLabel} contract draft (${fixed0(materialCount)} materials)`;''', '''    const typeLabel = data.tradeType === 'BUYING' ? t('act.cont.buy') : t('act.cont.sell');
    return t('act.cont.tradeDraft', typeLabel, fixed0(materialCount));''')
E('act.cont.loadingDraft', 'Loading draft {0}...', '正在加载草稿 {0}……')
R(CT, 'setStatus(`Loading draft ${newDraft.naturalId}...`);', "setStatus(t('act.cont.loadingDraft', newDraft.naturalId));")
R(CS, 'setStatus(`Loading draft ${newDraft.naturalId}...`);', "setStatus(t('act.cont.loadingDraft', newDraft.naturalId));")
E('act.cont.saveDetailsAsk', 'Save draft details?', '保存草稿信息？')
R(CT, "await waitAct('Save draft details?');", "await waitAct(t('act.cont.saveDetailsAsk'));")
R(CS, "await waitAct('Save draft details?');", "await waitAct(t('act.cont.saveDetailsAsk'));")
E('act.cont.invalidPrice', 'Invalid price for {0}', '{0} 的价格无效')
E('act.cont.noPriceFor', 'Could not find price input for {0}', '找不到 {0} 的价格输入框')
E('act.cont.priceFor', 'Price for {0}: {1} {2}', '{0} 的价格：{1} {2}')
R(CT, 'assert(isValidContractPrice(price), `Invalid price for ${ticker}`);', "assert(isValidContractPrice(price), t('act.cont.invalidPrice', ticker));")
R(CT, 'assert(priceInput, `Could not find price input for ${ticker}`);', "assert(priceInput, t('act.cont.noPriceFor', ticker));")
R(CT, 'log.info(`Price for ${ticker}: ${fixed02(price)} ${data.currency}`);', "log.info(t('act.cont.priceFor', ticker, fixed02(price), data.currency));")
E('act.cont.noLocation', 'Could not find trade location control', '找不到交易地点选择框')
R(CT, "'Could not find trade location control',", "t('act.cont.noLocation'),")
E('act.cont.setLocationAsk', 'Set location to {0}?', '把交易地点设为 {0}？')
E('act.cont.locationFailed', 'Could not select location: {0}', '无法选择交易地点：{0}')
E('act.cont.locationSet', 'Location set: {0}', '交易地点已设为：{0}')
R(CT, 'await waitAct(`Set location to ${data.location}?`);', "await waitAct(t('act.cont.setLocationAsk', data.location));")
R(CT, 'assert(locationSet, `Could not select location: ${data.location}`);', "assert(locationSet, t('act.cont.locationFailed', data.location));")
R(CT, 'log.info(`Location set: ${data.location}`);', "log.info(t('act.cont.locationSet', data.location));")
E('act.cont.applyTemplateAsk', 'Apply template?', '应用模板？')
E('act.cont.saveCondAsk', 'Save conditions?', '保存条件？')
E('act.cont.ready', 'Contract draft {0} ready to send', '合同草稿 {0} 已准备好，可以发送')
for f in (CT, CS):
    R(f, "await waitAct('Apply template?');", "await waitAct(t('act.cont.applyTemplateAsk'));")
    R(f, "await waitAct('Save conditions?');", "await waitAct(t('act.cont.saveCondAsk'));")
    R(f, 'log.success(`Contract draft ${newDraft.naturalId} ready to send`);', "log.success(t('act.cont.ready', newDraft.naturalId));")

E('act.cont.forPayment', ' for {0} {1}', '，报酬 {0} {1}')
E('act.cont.shipDraft', 'Create contract draft ({0} materials){1}', '创建合同草稿（{0} 种物资）{1}')
R(CS, "const payment = data.payment !== 0 ? ` for ${fixed0(data.payment)} ${data.currency}` : '';", "const payment =\n      data.payment !== 0 ? t('act.cont.forPayment', fixed0(data.payment), data.currency) : '';")
R(CS, 'return `Create contract draft (${fixed0(materialCount)} materials)${payment}`;', "return t('act.cont.shipDraft', fixed0(materialCount), payment);")
E('act.cont.matSkip', 'Material {0} not found, skipping', '找不到物资 {0}，已跳过')
R(CS, 'log.warning(`Material ${ticker} not found, skipping`);', "log.warning(t('act.cont.matSkip', ticker));")
E('act.cont.noMaterials', 'Material group has no materials to ship', '物资组里没有要运送的物资')
R(CS, "assert(materialDetails.length > 0, 'Material group has no materials to ship');", "assert(materialDetails.length > 0, t('act.cont.noMaterials'));")
E('act.cont.total', 'Total: {0}t, {1} {2} ({3} {2}/t)', '合计：{0} 吨，{1} {2}（{3} {2}/吨）')
R(CS, '`Total: ${fixed2(totalTonnage)}t, ${fixed0(data.payment)} ${data.currency} (${fixed0(data.payment / totalTonnage)} ${data.currency}/t)`,', '''t(
          'act.cont.total',
          fixed2(totalTonnage),
          fixed0(data.payment),
          data.currency,
          fixed0(data.payment / totalTonnage),
        ),''')
E('act.cont.noPrice', 'Could not find price input', '找不到价格输入框')
R(CS, "assert(priceInput, 'Could not find price input');", "assert(priceInput, t('act.cont.noPrice'));")
E('act.cont.priceSet', 'Price set: {0} {1}/commodity x{2} = {3} {1} total', '价格已设定：每种物资 {0} {1} × {2} = 共 {3} {1}')
R(CS, '`Price set: ${fixed0(pricePerCommodity)} ${data.currency}/commodity x${fixed0(materialDetails.length)} = ${fixed0(pricePerCommodity * materialDetails.length)} ${data.currency} total`,', '''t(
          'act.cont.priceSet',
          fixed0(pricePerCommodity),
          data.currency,
          fixed0(materialDetails.length),
          fixed0(pricePerCommodity * materialDetails.length),
        ),''')
for k, en, zh, field in [('Origin','origin','起点','contOrigin'),('Dest','destination','终点','contDest')]:
    E(f'act.cont.no{k}', f'Could not find {en} control', f'找不到{zh}选择框')
    E(f'act.cont.set{k}Ask', f'Set {en} to {{0}}?', f'把{zh}设为 {{0}}？')
    E(f'act.cont.{k.lower()}Failed', f'Could not select {en}: {{0}}', f'无法选择{zh}：{{0}}')
    E(f'act.cont.{k.lower()}Set', f'{en.capitalize()} set: {{0}}', f'{zh}已设为：{{0}}')
    R(CS, f"'Could not find {en} control',", f"t('act.cont.no{k}'),")
    R(CS, f'await waitAct(`Set {en} to ${{data.{field}}}?`);', f"await waitAct(t('act.cont.set{k}Ask', data.{field}));")
    var = 'originSet' if k == 'Origin' else 'destSet'
    R(CS, f'assert({var}, `Could not select {en}: ${{data.{field}}}`);', f"assert({var}, t('act.cont.{k.lower()}Failed', data.{field}));")
    R(CS, f'log.info(`{en.capitalize()} set: ${{data.{field}}}`);', f"log.info(t('act.cont.{k.lower()}Set', data.{field}));")
E('act.cont.settingStore', 'Setting auto-provision store...', '正在设置自动供货库存……')
E('act.cont.noStoreSelect', 'Auto-provision store select did not appear', '自动供货库存选择框没有出现')
E('act.cont.noStoreOption', 'Could not find auto-provision store option: {0}', '找不到自动供货库存选项：{0}')
E('act.cont.storeSet', 'Auto-provision store set: {0}', '自动供货库存已设为：{0}')
R(CS, "setStatus('Setting auto-provision store...');", "setStatus(t('act.cont.settingStore'));")
R(CS, "assert(storeSelect, 'Auto-provision store select did not appear');", "assert(storeSelect, t('act.cont.noStoreSelect'));")
R(CS, '`Could not find auto-provision store option: ${data.autoProvisionStoreId}`,', "t('act.cont.noStoreOption', data.autoProvisionStoreId),")
R(CS, 'log.info(`Auto-provision store set: ${storeSelect.options[optionIndex].text}`);', "log.info(t('act.cont.storeSet', storeSelect.options[optionIndex].text));")

S('XIT ACT —— 步骤：合同草稿通用操作')
for key, en, zh in [
    ('lookingCreate', 'Looking for Create New button...', '正在查找「新建」按钮……'),
    ('waitDraft', 'Waiting for draft to be created...', '等待草稿创建……'),
    ('settingName', 'Setting contract name...', '正在填写合同名称……'),
    ('savingDetails', 'Saving draft details...', '正在保存草稿信息……'),
    ('openingTemplate', 'Opening template selection...', '正在打开模板选择……'),
    ('addingMaterials', 'Adding materials to template...', '正在把物资加入模板……'),
    ('applyingTemplate', 'Applying template...', '正在应用模板……'),
    ('savingCond', 'Saving conditions...', '正在保存条件……'),
]:
    E(f'act.cont.{key}', en, zh)
    R(CU, f"setStatus('{en}');", f"setStatus(t('act.cont.{key}'));")
for key, en, zh in [
    ('noCreate', 'Could not find "Create New" button', '找不到「新建」按钮'),
    ('noNewDraft', 'Timed out waiting for new contract draft', '等待新合同草稿超时'),
    ('noName', 'Could not find name input', '找不到名称输入框'),
    ('noPreamble', 'Could not find preamble input', '找不到合同说明输入框'),
    ('notSaved', 'Draft details were not saved', '草稿信息没有保存成功'),
    ('noTemplateBtn', 'Could not find "Select Template" button', '找不到「选择模板」按钮'),
    ('noTemplateSelect', 'Could not find template type select', '找不到模板类型选择框'),
    ('noDeadline', 'Could not find deadline input', '找不到期限输入框'),
    ('noApply', 'Could not find "Apply Template" button', '找不到「应用模板」按钮'),
    ('notApplied', 'Template conditions were not received', '没有收到模板生成的条件'),
    ('condNotSaved', 'Contract conditions were not saved', '合同条件没有保存成功'),
]:
    E(f'act.cont.{key}', en, zh)
    R(CU, f"'{en}');", f"t('act.cont.{key}'));")
for key, en, zh in [
    ('saveDisabled', 'Draft details save button is missing or disabled', '草稿信息的保存按钮不存在或不可用'),
    ('templateInvalid', 'Template form is invalid', '模板表单填写有误'),
    ('condSaveDisabled', 'Conditions save button is missing or disabled', '条件的保存按钮不存在或不可用'),
]:
    E(f'act.cont.{key}', en, zh)
    R(CU, f"    '{en}',\n", f"    t('act.cont.{key}'),\n")
for key, en, zh in [('detailsSaved','Draft details saved','草稿信息已保存'),('preambleSet','Preamble set','合同说明已填写'),('templateApplied','Template applied','模板已应用'),('condSaved','Conditions saved','条件已保存')]:
    E(f'act.cont.{key}', en, zh)
    R(CU, f"log.info('{en}');", f"log.info(t('act.cont.{key}'));")
for key, en, zh, old, new in [
    ('newDraft', 'New draft created: {0}', '已创建新草稿：{0}', 'log.info(`New draft created: ${newDraft.naturalId}`);', "log.info(t('act.cont.newDraft', newDraft.naturalId));"),
    ('nameSet', 'Name set: {0}', '名称已填写：{0}', 'log.info(`Name set: ${name}`);', "log.info(t('act.cont.nameSet', name));"),
    ('noTemplate', 'Template "{0}" not found in the template select', '模板选择框里没有「{0}」模板', 'assert(index >= 0, `Template "${templateValue}" not found in the template select`);', "assert(index >= 0, t('act.cont.noTemplate', templateValue));"),
    ('templateSelected', 'Selected "{0}" template', '已选择「{0}」模板', 'ctx.log.info(`Selected "${templateValue}" template`);', "ctx.log.info(t('act.cont.templateSelected', templateValue));"),
    ('noCurrency', 'Could not find currency select for {0}', '找不到 {0} 的货币选择框', 'assert(currencySelect, `Could not find currency select for ${currency}`);', "assert(currencySelect, t('act.cont.noCurrency', currency));"),
    ('currencySet', 'Currency set to {0}', '货币已设为 {0}', 'log.info(`Currency set to ${currency}`);', "log.info(t('act.cont.currencySet', currency));"),
    ('noAddBtn', 'Could not find add button for {0}', '找不到 {0} 的添加按钮', 'assert(addBtn, `Could not find add button for ${material.ticker}`);', "assert(addBtn, t('act.cont.noAddBtn', material.ticker));"),
    ('noGroup', 'Could not find group for {0}', '找不到 {0} 所在的条目', 'assert(group, `Could not find group for ${material.ticker}`);', "assert(group, t('act.cont.noGroup', material.ticker));"),
    ('noAmountFor', 'Could not find amount input for {0}', '找不到 {0} 的数量输入框', 'assert(amountInput, `Could not find amount input for ${material.ticker}`);', "assert(amountInput, t('act.cont.noAmountFor', material.ticker));"),
    ('noMatSelector', 'Could not find material selector for {0}', '找不到 {0} 的物资选择框', 'assert(matSelector, `Could not find material selector for ${material.ticker}`);', "assert(matSelector, t('act.cont.noMatSelector', material.ticker));"),
    ('noSelect', 'Could not select material {0}', '无法选择物资 {0}', 'assert(selected, `Could not select material ${material.ticker}`);', "assert(selected, t('act.cont.noSelect', material.ticker));"),
    ('added', 'Added: {0} x{1}', '已添加：{0} × {1}', 'log.info(`Added: ${material.ticker} x${fixed0(material.amount)}`);', "log.info(t('act.cont.added', material.ticker, fixed0(material.amount)));"),
    ('deadlineRange', 'Deadline must be from {0} to {1} days', '期限必须在 {0} 到 {1} 天之间', '`Deadline must be from ${minContractDays} to ${maxContractDays} days`,', "t('act.cont.deadlineRange', minContractDays, maxContractDays),"),
    ('deadlineSet', 'Deadline set: {0} days', '期限已设为 {0} 天', 'log.info(`Deadline set: ${fixed0(days)} days`);', "log.info(t('act.cont.deadlineSet', fixed0(days)));"),
]:
    E(f'act.cont.{key}', en, zh)
    R(CU, old, new)

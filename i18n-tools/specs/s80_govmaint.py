from tr import S, E, R

S('新功能 —— GOVBURN 维护')
for k, en, zh in [
    ('maintain', 'MAINTAIN', '维护'),
    ('maintainAll', 'MAINTAIN ALL', '一键维护'),
    ('maintaining', 'MAINTAINING…', '维护中…'),
]:
    E(f'gov.sum.{k}', en, zh)
E('gov.maint.title', 'Maintain', '维护')
E('gov.maint.description', 'Moves upkeep materials from the planet warehouse to your base and contributes them to the selected slots and the CoGC.', '把星球仓库里的维护物资转到你的基地，再捐给选中的槽位和 COGC。')
E('gov.maint.params', 'Planet or ALL', '星球或 ALL')
E('act.gbm.short', 'Maintain planet from warehouse', '用仓库物资维护星球')
E('act.gbm.desc', 'Maintain {0} from its warehouse', '用仓库物资维护 {0}')
E('act.gbm.noBase', 'You have no base on {0}.', '你在 {0} 没有基地。')
E('act.gbm.noWarehouse', 'You have no warehouse on {0}.', '你在 {0} 没有仓库。')
E('act.gbm.nothing', 'Nothing to maintain on {0} from the warehouse.', '{0} 没有可以用仓库物资维护的项目。')
E('act.contribute.desc', 'Contribute {0} to {1} on {2}', '向 {2} 的 {1} 捐献 {0}')
E('act.contribute.setup', 'Setting contribution amounts...', '正在设置捐献数量...')
E('act.contribute.noTable', 'No contribution table in {0}.', '{0} 里找不到捐献表。')
E('act.contribute.noRow', 'No {0} row in {1}.', '{1} 里找不到 {0} 这一行。')
E('act.contribute.short', '{0}: could only set {1} of {2} (slider max {3}).', '{0}：只能设置 {1}（计划 {2}，滑块上限 {3}）。')
E('type.GovBurn Maintain', 'GovBurn Maintain', '仓库维护')

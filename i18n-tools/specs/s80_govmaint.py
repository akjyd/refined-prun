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

# COGC vote during maintain.
E('act.vote.desc', 'Vote the current CoGC program on {0}', '为 {0} 的 COGC 投当前项目')
E('act.vote.noProgram', 'No CoGC program runs on {0} now. No vote.', '{0} 当前没有 COGC 项目，不投票。')
E('act.vote.already', 'You already voted {0} on {1}.', '{1} 已投 {0}。')
E('act.vote.noRow', 'No vote row for {0} in {1}.', '{1} 里找不到 {0} 的投票行。')
E('act.vote.failed', 'The vote for {0} on {1} did not register.', '{1} 投 {0} 未生效。')
E('act.vote.done', 'Voted {0} on {1}.', '{1} 已投票：{0}。')

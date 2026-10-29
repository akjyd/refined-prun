from tr import S, E, R
f = 'src/features/XIT/ACT/agent-sync.ts'
S('XIT ACT —— 代理频道同步错误')
E('act.sync.idsFull', 'All 26 agent message ids for today are in use.', '今天的 26 个代理消息编号已经全部用完。')
E('act.sync.collision', 'Action package can\'t sync: "{0}" matches a sync short code - rename it.', '动作包无法同步：“{0}”和同步用的缩写冲突，请改名。')
E('act.sync.tooLarge', 'Action package too large to sync ({0} > {1} chars).', '动作包太大，无法同步（{0} > {1} 个字符）。')
R(f, "throw new Error('All 26 agent message ids for today are in use.');", "throw new Error(t('act.sync.idsFull'));")
R(f, '`Action package can\'t sync: "${collision}" matches a sync short code - rename it.`,', "t('act.sync.collision', collision),")
R(f, '`Action package too large to sync (${text.length} > ${maxMessageLength} chars).`,', "t('act.sync.tooLarge', text.length, maxMessageLength),")

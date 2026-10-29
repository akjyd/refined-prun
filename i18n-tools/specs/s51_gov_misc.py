from tr import S, E, R

S('XIT ELEC（选举）')
f = 'src/features/XIT/ELEC/ELEC.ts'
E('elec.title', 'ELECTIONS', '选举')
E('elec.description', 'Upcoming elections for planets you have bases on.', '你有基地的星球上即将举行的选举。')
R(f, "name: 'ELECTIONS',", "name: t('elec.title'),")
R(f, "description: 'Upcoming elections for planets you have bases on.',", "description: t('elec.description'),")
f = 'src/features/XIT/ELEC/ELEC.vue'
E('elec.filter.gov', 'GOV', '州长')
R(f, '<RadioItem v-model="gov" horizontal>GOV</RadioItem>', "<RadioItem v-model=\"gov\" horizontal>{{ t('elec.filter.gov') }}</RadioItem>")
E('elec.col.planet', 'Planet', '星球')
E('elec.col.type', 'Type', '类型')
E('elec.col.voting', 'Voting', '投票')
E('elec.col.ends', 'Ends', '结束')
for k, en in [('planet','Planet'),('type','Type'),('voting','Voting'),('ends','Ends')]:
    R(f, f'<th>{en}</th>', f"<th>{{{{ t('elec.col.{k}') }}}}</th>")
E('elec.vote', 'VOTE', '投票')
R(f, "\n              VOTE\n", "\n              {{ t('elec.vote') }}\n")
E('elec.now', 'Now', '现在')
R(f, '<template v-else-if="isPastOrNow(row.electionEnd)">Now</template>', "<template v-else-if=\"isPastOrNow(row.electionEnd)\">{{ t('elec.now') }}</template>")
E('elec.dh', '{0}d {1}h', '{0}天{1}小时')
E('elec.hm', '{0}h {1}m', '{0}小时{1}分')
E('elec.ms', '{0}m {1}s', '{0}分{1}秒')
E('elec.s', '{0}s', '{0}秒')
R(f, 'return `${days}d ${hours}h`;', "return t('elec.dh', days, hours);")
R(f, 'return `${hours}h ${minutes}m`;', "return t('elec.hm', hours, minutes);")
R(f, 'return `${minutes}m ${seconds}s`;', "return t('elec.ms', minutes, seconds);")
R(f, 'return `${seconds}s`;', "return t('elec.s', seconds);")
R(f, "return '0s';", "return t('elec.s', 0);")

S('游戏窗口里的政府相关功能')
f = 'src/features/basic/contribution-bulk-controls.tsx'
E('feat.contrib.all', 'ALL', '全部')
E('feat.contrib.none', 'NONE', '清零')
R(f, '\n        ALL\n', "\n        {t('feat.contrib.all')}\n")
R(f, '\n        NONE\n', "\n        {t('feat.contrib.none')}\n")
f = 'src/features/basic/co-base-count.tsx'
E('feat.co.baseCount', 'Base Count', '基地数')
R(f, '<Passive label="Base Count">', "<Passive label={t('feat.co.baseCount')}>")
f = 'src/features/advanced/pli-cogc-label.ts'
E('feat.pli.cogcInactive', 'CoGC (Inactive)', 'COGC（未启用）')
E('feat.pli.cogc', 'CoGC ({0})', 'COGC（{0}）')
R(f, "return 'CoGC (Inactive)';", "return t('feat.pli.cogcInactive');")
R(f, 'return `CoGC (${localized})`;', "return t('feat.pli.cogc', localized);")
f = 'src/features/advanced/cogcpex-clean-labels.ts'
E('feat.cogcpex.vote', 'vote', '投票')
R(f, "button.textContent = 'vote';", "button.textContent = t('feat.cogcpex.vote');")

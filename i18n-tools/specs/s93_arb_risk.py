from tr import S, E, R

S('ARB：按翻车率解算')

E('arb.failureLabel', 'Risk', '翻车率')
E('arb.failure', 'Risk', '翻车率')
E('arb.perDayReturn', 'Return/day', '天利润率')
E('arb.unitsFill', 'Units now/total', '数量 立即/总')
E('arb.tipFailure',
  'How often a trade like this loses money, measured from past prices. Set what you accept in '
  'XIT SET; the size of every trade follows from it.',
  '这一单亏钱的概率，用历史价格实测出来的。你能接受多少在 XIT SET 里设，每一单的数量由它推出来。')
E('set.arb.title', 'Arbitrage', '倒货')
E('set.arb.failure', 'Acceptable risk', '可接受翻车率')
E('set.arb.failureHint',
  '0-100. Lower is stricter and shows fewer chances.',
  '0–100。越低越严，机会越少。')
E('set.arb.minDaily', 'Least profit a day', '最低天利润')
E('set.arb.minDailyHint', 'Trades under this are not shown.', '低于这个数的不显示。')
E('set.arb.maxDays', 'Longest wait', '最长天数')
E('set.arb.maxDaysHint',
  'Days you are willing to wait. A trade that needs longer is not shown.',
  '你愿意等几天。需要更久的不显示。')

F = 'src/features/XIT/SET/SET.vue'
R(F, "import ACT from '@src/features/XIT/SET/ACT.vue';",
   "import ACT from '@src/features/XIT/SET/ACT.vue';\n"
   "import ARB from '@src/features/XIT/SET/ARB.vue';")
R(F, """    id: 'ACT',
    label: 'ACT',
    component: ACT,
  },""",
  """    id: 'ACT',
    label: 'ACT',
    component: ACT,
  },
  {
    id: 'ARB',
    label: t('set.arb.title'),
    component: ARB,
  },""")

E('arblog.ahead', 'queue {0}d', '排队 {0} 天')
E('arb.worstFailure', 'Worst risk', '最差翻车率')
E('arb.ifListed',
  'Offered instead: {0} units, {1} profit, {2} days, risk {3}',
  '若全部改成挂单卖：{0} 个，利润 {1}，{2} 天，翻车率 {3}')

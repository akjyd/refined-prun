from tr import S, E, R

S('ARB：按翻车率解算')

E('arb.failureLabel', 'Risk', '翻车率')
E('arb.failure', 'Risk', '翻车率')
E('arb.perDayReturn', 'Return/day', '天利润率')
E('arb.tipFailure',
  'How often a trade like this loses money, measured from past prices. Set what you accept in '
  'XIT SET; the size of every trade follows from it.',
  '这一单亏钱的概率，用历史价格实测出来的。你能接受多少在 XIT SET 里设，每一单的数量由它推出来。')
E('set.arb.title', 'Arbitrage', '倒货')
E('set.arb.failure', 'Highest risk', '最高翻车率')
E('set.arb.failureHint',
  '0-100. The share of trades that may end in a loss.\n'
  '\n'
  'Every order the plan buys must earn enough by itself to stand the usual price moves over '
  'the days it is held. This number sets how much is enough.\n'
  '\n'
  'Lower is stricter: fewer chances, and each one smaller.',
  '0–100。允许多大比例的交易最后是亏的。\n'
  '\n'
  '方案买进的每一张单，都要自己赚够钱，撑得住持有期间的常见价格波动。这个数值决定「赚够」是多少。\n'
  '\n'
  '越低越严：机会更少，每笔的量也更小。')
E('set.arb.minDaily', 'Least profit a day', '最低天利润')
E('set.arb.minDailyHint', 'Trades under this are not shown.', '低于这个数的不显示。')
E('set.arb.maxDays', 'Longest cycle', '最长周期')
E('set.arb.maxDaysHint',
  'Days you are willing to tie the money up, the flight and the sale together. '
  'An offer that needs longer is cut back.',
  '你愿意让这笔钱被占住几天，运输 + 售卖一起算。需要更久的部分会被砍掉。')
E('set.arb.groupArb', 'Arbitrage list', '倒货')
E('set.arb.groupLog', 'Arbitrage log', '倒货记录')
E('set.arb.share', 'Share of trade', '吃单比例')
E('set.arb.shareHint',
  '0-1. The part of the trade of the end exchange you count on getting.\n'
  '\n'
  'Not all of the trade can be yours: a part of it is requests you do not take, and a part '
  'goes to the offers of other traders that stand in front of yours.\n'
  '\n'
  '1 counts on all of the trade.',
  '0–1。终点市场的成交量里，你预计能吃到的那一部分。\n'
  '\n'
  '成交量不会全是你的：其中有一部分是你不会去接的买单，还有一部分被排在你前面的别人的挂单吃掉。\n'
  '\n'
  '填 1 表示把成交量全部算成你的。')
E('set.arb.flight', 'Flight days', '运输天数')
E('set.arb.flightHint',
  'Days between two exchanges. A flight takes as long each way, so one value covers both.',
  '两个交易所之间的飞行天数。来回用时相同，所以一个值管两个方向。')

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
E('arblog.queue', 'Queue / day', '排队量 / 日成交')
E('set.arb.queue', 'Price cut warning', '压价提醒')
E('set.arb.queueHint',
  'The dot lights up when the orders in front of yours hold this many days of trade.\n'
  '\n'
  'Units in front / daily trade.\n'
  '\n'
  'A lit dot means the queue takes that long to clear, so a price cut is worth thinking about.',
  '当你的单子前面排着的量，够市场成交这么多天时，亮起小圆点。\n'
  '\n'
  '前面的数量 ÷ 日交易量。\n'
  '\n'
  '圆点亮起表示：前面的单子要这么久才清得完，可以考虑压价。')
E('orders.pin', 'Keep this book listed', '固定这个订单簿，没有单子也不消失')

E('arblog.profitVsPlan', 'Profit / planned', '利润 / 期望利润')
E('arblog.perDayVsPlan', 'Profit a day / planned', '天利润 / 期望天利润')
E('arb.modeFill', 'Fill', '填单')
E('arb.modeList', 'Offer', '挂单')
E('arb.settings', 'Settings', '设置')
E('arb.saleDays', 'Sale days', '售卖天数')
E('arb.unitsFill', 'Can fill / total', '可填 / 总量')
E('arb.reload', 'Reload', '刷新')
E('arb.daily', 'Daily trade', '日交易量')
E('arb.noFill', 'The requests of the end exchange cannot take any of this trade.', '终点市场的买单吃不下这批货，只能挂单。')
E('arb.total', 'Total', '总量')

from tr import S, E, R

S('ARB：利润/天')

E('arb.perDay', 'Profit/day', '利润/天')
E('arb.tradeDays', 'Days', '预计天数')
E('arblog.daysVsPlan', 'Days / expected', '用时 / 预计')
E('arblog.perDay', 'Profit/day / plan', '利润/天 / 计划')
E('arb.new', 'New', '新')
E('arb.allRead', 'Mark all read', '全部已读')
E('arb.chartTitle', 'Profit/day · {0} ship, {1} days of trade', '利润/天 · 按 {0} 船、{1} 日成交计算')
E('arb.chartEmpty', 'No history yet', '还没有记录')

E('arb.hurdle', 'Hurdle', '风险门槛')
E('arb.hurdleOff', 'Off', '关')
E('arb.tipUnits',
  'Left: units the requests of the end exchange take the moment the ship lands. '
  'Right: the whole trade, the smallest of three numbers - what the ship holds; '
  'the daily trade times the longest sale days times the share of trade (XIT SET); '
  'and the units on offer at the start exchange that still earn enough at your risk setting.',
  '左边：船一落地，终点市场的买单能立刻吃掉的数量。'
  '右边：这次倒货的总量，取三者里最小的一个——'
  '船能装多少；日交易量 × 最长售卖天数 × 吃单比例（设置里改）；'
  '以及起点市场上、在你的翻车率下利润仍然达标的卖单数量。')
E('arb.tipCost', 'What you pay for the goods on the start exchange.', '在起点买入这些货要花的钱。')
E('arb.tipDays',
  'Days the offered part needs to sell after the ship lands, flight not counted: the offered '
  'units over the daily trade. Flight days are in XIT SET. OLD: '
  'Flight days plus the days a listed sale waits. Flight: 1 day between neighbour exchanges, '
  '2 otherwise. Listed days = units / daily trade of the end exchange. A fill sells at once, so '
  '0 days. The return trip is not counted.',
  '运输天数 + 预计挂单天数。运输：相邻交易所 1 天，不相邻 2 天。挂单天数 = 数量 ÷ 终点每日成交量。'
  '填单到了当场卖出，算 0 天。回程不算。')
E('arb.tipPerDay',
  'Profit over the expected days: what this trade makes for each day it holds your ship and your '
  'money. Use it to compare a slow big trade with a fast small one.',
  '利润 ÷ 预计天数：这一单占着你的船和钱，每天赚多少。用它比较「慢的大单」和「快的小单」。')
E('arb.tipReturn',
  'Profit / what you pay. Use it to compare trades of different size; 5% means 50,000 on a '
  'million.',
  '利润 ÷ 买入花的钱。用它比较本金不同的单：5% 就是花 100 万赚 5 万。')
E('arb.tipSafety',
  'Return / the usual price move over the expected days. Over 1: one usual drop still leaves a '
  'profit. Under 1: one usual drop can turn the trade into a loss.',
  '回报率 ÷ 这几天价格的正常波动幅度。大于 1：价格正常跌一次，仍然有利润。小于 1：正常跌一次就可能亏。'
  '波动幅度按终点近 30 天的日线算。')
E('arb.tipHurdle',
  'How much each order taken must make by itself, as a multiple of one usual price move over the '
  'expected days. Off buys any order that is cheaper than the sell price, even by one step.',
  '每一张卖单要自己赚够多少才买，按「预计天数里一次正常波动」的倍数算。'
  '关 = 只要比卖出价便宜一点就买，哪怕只便宜一档。')
E('arblog.tipPerDay',
  'Realized profit over the days so far, against the plan: planned profit over the expected days.',
  '左：已实现利润 ÷ 已用天数。右：买入时的计划利润 ÷ 预计天数。两者对比，看这一批走得比计划快还是慢。')
E('arblog.tipDays',
  'Days from the buy until now, or until the last sale; against the days expected when you '
  'bought. Red when it is over.',
  '从买入到现在（卖完的批次算到最后一笔卖出）的天数，和买入时的预计天数对比。超过预计时变红。')

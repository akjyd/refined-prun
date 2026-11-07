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
  'Left: units the requests of the end exchange take the moment the ship lands.\n'
  '\n'
  'Right: the whole trade. It is the smallest of three numbers:\n'
  '\n'
  '1. What the ship holds.\n'
  '2. [[Daily trade::The 30-day trade of the end exchange over 30 days, times the share of '
  'trade.]] x [[longest cycle::Days you are willing to tie the money up, the flight and the '
  'sale together. In XIT SET.]] x [[share of trade::The part of the trade of the end exchange '
  'you count on getting. Not all of it can be yours. In XIT SET.]].\n'
  '3. The offers at the start exchange that still earn enough at your '
  '[[risk setting::The share of trades that may end in a loss. Every order bought must earn '
  'enough by itself to stand the usual price moves over the days it is held. In XIT SET.]].\n'
  '\n'
  'Press E to lock this, then point at an underlined word for more.',
  '左边：船一落地，终点市场的买单立刻能吃掉的数量。\n'
  '\n'
  '右边：这次倒货的总量。取下面三个数里最小的一个：\n'
  '\n'
  '1. 船能装多少\n'
  '2. [[日交易量::终点市场 30 日成交量 ÷ 30，再乘以吃单比例。]] × '
  '[[最长周期::你愿意让这笔钱被占住几天，运输 + 售卖一起算。在设置里改。]] × '
  '[[吃单比例::终点市场成交量里你预计能吃到的那一部分。不会全是你的。在设置里改。]]\n'
  '3. 起点市场上，在你设的'
  '[[翻车率::允许多大比例的交易最后是亏的。买进的每一张单都要自己赚够钱，撑得住持有期间的常见'
  '价格波动。在设置里改。]]下，利润仍然达标的卖单数量\n'
  '\n'
  '按 E 可以把这个说明固定住，然后把鼠标移到带虚线的词上看它的解释。')
E('arb.tipCost', 'What you pay for the goods on the start exchange.', '在起点买入这些货要花的钱。')
E('arb.tipDays',
  'Days the offered part needs to sell after the ship lands. The flight is not counted here.\n'
  '\n'
  'Offered units / [[daily trade::The 30-day trade of the end exchange over 30 days, times '
  'the share of trade you set in XIT SET.]].\n'
  '\n'
  'The profit a day is still counted over the flight plus the sale, because the money is tied '
  'up from the moment you buy.',
  '货到之后，挂单部分卖完需要几天。这里不含运输时间。\n'
  '\n'
  '挂单数量 ÷ [[日交易量::终点市场 30 日成交量 ÷ 30，再乘以你在设置里填的吃单比例。]]。\n'
  '\n'
  '天利润仍然按「运输 + 售卖」的总天数算，因为钱从买入那一刻就被占住了。')
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

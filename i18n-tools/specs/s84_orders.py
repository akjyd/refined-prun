from tr import S, E, R

S('新功能 —— XIT ORDERS 我的挂单')
E('orders.title', 'MY ORDERS', '我的挂单')
E('orders.description', 'Order books of every material where you have orders on an exchange.', '你在一个市场有挂单的每种物资，显示它们的订单簿。')
E('orders.none', 'You have no orders on this exchange.', '你在这个市场没有挂单。')
E('orders.badDrop', 'The order cannot go there: it would cross the spread.', '不能放在这里：会越过价差，直接成交。')
E('orders.replaceFailed', 'The old order was deleted, but placing {0} {1} again failed ({3}). The old price was {2}.', '原单已撤销，但重新挂 {0} 个 {1} 失败（{3}）。原价是 {2}。')

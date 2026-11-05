// Arbitrage batches: a buy from XIT ARB and the sales that follow it.
// A batch starts when you place a buy order from XIT ARB. Its buys are the trades of that order.
// Its sales are the sell trades of the material on the end exchange after the batch started,
// oldest batch first, up to what the batch bought (player, 2026-11-05: method A).

export interface ArbTrade {
  // Game trade id. A trade split between two batches has the same id in both.
  id: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  time: number;
}

export interface ArbPlan {
  units: number;
  cost: number;
  sellPrice: number;
  profit: number;
  return: number;
  safety?: number;
}

export interface ArbBatch {
  id: string;
  ticker: string;
  from: string;
  to: string;
  mode: 'now' | 'listed';
  createdAt: number;
  plan: ArbPlan;
  // Buy orders of this batch (also orders placed again by a chase).
  buyOrders: string[];
  trades: ArbTrade[];
}

export type ArbStatus = 'buying' | 'holding' | 'selling' | 'done';

export interface OrderTrades {
  id: string;
  type: 'BUYING' | 'SELLING';
  ticker: string;
  exchange: string;
  trades: { id: string; amount: number; price: number; time: number }[];
}

function sum(trades: ArbTrade[], side: ArbTrade['side'], value: (x: ArbTrade) => number) {
  let total = 0;
  for (const trade of trades) {
    if (trade.side === side) {
      total += value(trade);
    }
  }
  return total;
}

export function bought(batch: ArbBatch) {
  return sum(batch.trades, 'buy', x => x.amount);
}

export function sold(batch: ArbBatch) {
  return sum(batch.trades, 'sell', x => x.amount);
}

export function buyCost(batch: ArbBatch) {
  return sum(batch.trades, 'buy', x => x.amount * x.price);
}

export function revenue(batch: ArbBatch) {
  return sum(batch.trades, 'sell', x => x.amount * x.price);
}

// Profit of the part sold so far, at the average buy price.
export function realizedProfit(batch: ArbBatch) {
  const units = bought(batch);
  const soldUnits = sold(batch);
  if (units <= 0 || soldUnits <= 0) {
    return undefined;
  }
  return revenue(batch) - (buyCost(batch) / units) * soldUnits;
}

export function status(batch: ArbBatch, openBuyOrders: number): ArbStatus {
  const units = bought(batch);
  const soldUnits = sold(batch);
  if (units > 0 && soldUnits >= units && openBuyOrders === 0) {
    return 'done';
  }
  if (soldUnits > 0) {
    return 'selling';
  }
  return openBuyOrders > 0 ? 'buying' : 'holding';
}

// Adds the new trades of the orders to the batches. Returns true when something changed.
export function syncBatches(batches: ArbBatch[], orders: OrderTrades[]) {
  let changed = false;
  // Buys: the trades of each batch's own buy orders.
  for (const batch of batches) {
    const seen = new Set(batch.trades.filter(x => x.side === 'buy').map(x => x.id));
    for (const order of orders) {
      if (order.type !== 'BUYING' || !batch.buyOrders.includes(order.id)) {
        continue;
      }
      for (const trade of order.trades) {
        if (!seen.has(trade.id)) {
          batch.trades.push({ ...trade, side: 'buy' });
          seen.add(trade.id);
          changed = true;
        }
      }
    }
  }
  // Sales: each new sell trade goes to the oldest batch of the same material and end exchange
  // that started before it and still has units left.
  const assigned = new Map<string, number>();
  for (const batch of batches) {
    for (const trade of batch.trades) {
      if (trade.side === 'sell') {
        assigned.set(trade.id, (assigned.get(trade.id) ?? 0) + trade.amount);
      }
    }
  }
  const sells = orders
    .filter(x => x.type === 'SELLING')
    .flatMap(order => order.trades.map(trade => ({ order, trade })))
    .sort((a, b) => a.trade.time - b.trade.time);
  const ordered = [...batches].sort((a, b) => a.createdAt - b.createdAt);
  for (const { order, trade } of sells) {
    let left = trade.amount - (assigned.get(trade.id) ?? 0);
    for (const batch of ordered) {
      if (left <= 0) {
        break;
      }
      if (
        batch.ticker !== order.ticker ||
        batch.to !== order.exchange ||
        batch.createdAt > trade.time
      ) {
        continue;
      }
      const room = bought(batch) - sold(batch);
      if (room <= 0) {
        continue;
      }
      const take = Math.min(room, left);
      batch.trades.push({ ...trade, amount: take, side: 'sell' });
      assigned.set(trade.id, (assigned.get(trade.id) ?? 0) + take);
      left -= take;
      changed = true;
    }
  }
  return changed;
}

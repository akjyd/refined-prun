import { ArbBatch, ArbPlan, ArbSnapshot, OrderTrades, syncBatches } from '@src/core/arb-batches';
import { cxosStore } from '@src/infrastructure/prun-api/data/cxos';
import { userData } from '@src/store/user-data';
import { createId } from '@src/store/create-id';

// A CXPO opened from XIT ARB waits for its buy order; the order then starts a batch.
interface Pending {
  ticker: string;
  from: string;
  to: string;
  mode: ArbBatch['mode'];
  plan: ArbPlan;
  tripId?: string;
  snapshot?: ArbSnapshot;
  at: number;
}

// An order of a batch placed again (chase) waits for its new order.
interface Chase {
  batchId: string;
  ticker: string;
  exchange: string;
  at: number;
}

const PENDING_MS = 30 * 60_000;

let pending: Pending | undefined;
let chase: Chase | undefined;

export function startArbBatch(value: Omit<Pending, 'at'>) {
  pending = { ...value, at: Date.now() };
}

// True when no buy from XIT ARB waits for its order.
export function isArbBatchLinked() {
  return pending === undefined;
}

export function startChase(batchId: string, ticker: string, exchange: string) {
  chase = { batchId, ticker, exchange, at: Date.now() };
}

export function toOrderTrades(order: PrunApi.CXOrder): OrderTrades {
  return {
    id: order.id,
    type: order.type,
    ticker: order.material.ticker,
    exchange: order.exchange.code,
    trades: (order.trades ?? []).map(x => ({
      id: x.id,
      amount: x.amount,
      price: x.price.amount,
      time: x.time.timestamp,
    })),
  };
}

function isLinked(orderId: string) {
  return userData.arbBatches.some(x => x.buyOrders.includes(orderId));
}

// Links new buy orders to a pending batch or chase, then adds new trades to the batches.
export function trackArbBatches(orders: PrunApi.CXOrder[]) {
  const now = Date.now();
  if (pending && now - pending.at > PENDING_MS) {
    pending = undefined;
  }
  if (chase && now - chase.at > PENDING_MS) {
    chase = undefined;
  }
  for (const order of orders) {
    if (order.type !== 'BUYING' || isLinked(order.id)) {
      continue;
    }
    const created = order.created.timestamp;
    const ticker = order.material.ticker;
    const code = order.exchange.code;
    if (chase && ticker === chase.ticker && code === chase.exchange && created >= chase.at - 5000) {
      userData.arbBatches.find(x => x.id === chase!.batchId)?.buyOrders.push(order.id);
      chase = undefined;
      continue;
    }
    if (
      pending &&
      ticker === pending.ticker &&
      code === pending.from &&
      created >= pending.at - 5000
    ) {
      userData.arbBatches.push({
        id: createId(),
        ticker,
        from: pending.from,
        to: pending.to,
        mode: pending.mode,
        createdAt: created,
        plan: pending.plan,
        tripId: pending.tripId,
        snapshot: pending.snapshot,
        buyOrders: [order.id],
        trades: [],
      });
      pending = undefined;
    }
  }
  if (userData.arbBatches.length > 0) {
    syncBatches(userData.arbBatches, orders.map(toOrderTrades));
  }
}

export function watchArbBatches() {
  watch(
    () => cxosStore.all.value,
    orders => {
      if (orders) {
        trackArbBatches(orders);
      }
    },
    { deep: true, immediate: true },
  );
}

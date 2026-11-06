import { onApiMessage } from '@src/infrastructure/prun-api/data/api-messages';
import { cxosStore } from '@src/infrastructure/prun-api/data/cxos';

// Every deletion of an open CX order (not filled, or partly filled), however it was deleted:
// in the game, by drag or by a chase in RP. Changing a price is a deletion too. The player uses
// it to learn how many orders a day can be deleted before the deletion fee (2026-11-06).
// Deleting a filled order only clears it from the list and is not recorded.
// Kept in the page's localStorage, apart from the user data.

export interface CxDeletion {
  at: number;
  orderId: string;
  ticker: string;
  exchange: string;
  side: 'buy' | 'sell';
  // Units left in the order when it was deleted, and its limit price.
  amount: number;
  price: number;
  partly: boolean;
}

const KEY = 'refined-prun-cxdeletes';
const KEEP_MS = 60 * 86_400_000;
const MAX = 3000;

function load(): CxDeletion[] {
  try {
    const text = localStorage.getItem(KEY);
    return text !== null ? (JSON.parse(text) as CxDeletion[]) : [];
  } catch {
    return [];
  }
}

export const cxDeletions = ref<CxDeletion[]>(load());

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cxDeletions.value));
  } catch {
    // Storage full or blocked: keep the records in memory for this session.
  }
}

// The orders as last seen, because the store drops an order before other handlers of the
// removal message run.
const known = new Map<string, PrunApi.CXOrder>();

export function watchCxDeletions() {
  watch(
    () => cxosStore.passiveAll.value,
    orders => {
      for (const order of orders ?? []) {
        known.set(order.id, order);
      }
    },
    { immediate: true, deep: true },
  );
  onApiMessage({
    COMEX_TRADER_ORDER_REMOVED(data: { orderId: string }) {
      const order = known.get(data.orderId);
      known.delete(data.orderId);
      if (!order || order.status === 'FILLED') {
        return;
      }
      const now = Date.now();
      const record: CxDeletion = {
        at: now,
        orderId: order.id,
        ticker: order.material.ticker,
        exchange: order.exchange.code,
        side: order.type === 'BUYING' ? 'buy' : 'sell',
        amount: order.amount,
        price: order.limit.amount,
        partly: order.status === 'PARTIALLY_FILLED',
      };
      cxDeletions.value = [...cxDeletions.value.filter(x => now - x.at < KEEP_MS), record].slice(
        -MAX,
      );
      save();
    },
  });
}

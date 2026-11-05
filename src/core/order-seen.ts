import { cxosStore } from '@src/infrastructure/prun-api/data/cxos';
import { fixed0 } from '@src/utils/format';
import { userData } from '@src/store/user-data';
import { t } from '@src/i18n';

// Changes of your CX orders since you last left XIT ORDERS, so they stand out. The same in
// CXOB, XIT CX4 and XIT ORDERS. Only XIT ORDERS saves the amounts (when it closes or on
// REFRESH).

// Text for a changed order: "−200" (amount filled since then), "new", or undefined.
export function orderChange(orderId: string, amount: number) {
  const seen = userData.orderSeen;
  if (Object.keys(seen).length === 0) {
    return undefined;
  }
  const before = seen[orderId];
  if (before === undefined) {
    return t('orders.new');
  }
  return amount !== before
    ? `${amount < before ? '−' : '+'}${fixed0(Math.abs(before - amount))}`
    : undefined;
}

export function saveSeenOrders() {
  const seen: Record<string, number> = {};
  for (const order of cxosStore.active.value ?? []) {
    seen[order.id] = order.amount;
  }
  userData.orderSeen = seen;
}

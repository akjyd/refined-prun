import { cxosStore } from '@src/infrastructure/prun-api/data/cxos';
import { fixed0 } from '@src/utils/format';
import { userData } from '@src/store/user-data';
import { t } from '@src/i18n';

// Changes of your CX orders since your previous visit to XIT ORDERS, so they stand out. The
// same in CXOB, XIT CX4 and XIT ORDERS. Each visit to XIT ORDERS saves the amounts for the
// next visit and compares with the amounts of the visit before.

// The amounts to compare with, set by each XIT ORDERS visit.
const baseline = shallowRef<Record<string, number | undefined>>();

function compareWith() {
  return baseline.value ?? userData.orderSeen;
}

// Text for a changed order: "−200" (amount filled since then), "new", or undefined.
export function orderChange(orderId: string, amount: number) {
  const seen = compareWith();
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

function currentAmounts() {
  const seen: Record<string, number> = {};
  for (const order of cxosStore.active.value ?? []) {
    seen[order.id] = order.amount;
  }
  return seen;
}

// Called when XIT ORDERS opens: compare with the previous visit, save this one.
export function startOrdersVisit() {
  if (!cxosStore.fetched.value) {
    return false;
  }
  baseline.value = { ...userData.orderSeen };
  userData.orderSeen = currentAmounts();
  return true;
}

// REFRESH: from now on, compare with the current amounts.
export function saveSeenOrders() {
  const now = currentAmounts();
  baseline.value = now;
  userData.orderSeen = { ...now };
}

// Your CX order by id. Reading cxosStore.all makes sure the orders are requested, also when
// no CXOS window was opened in this session.
export function getOwnCxOrder(orderId: string) {
  void cxosStore.all.value;
  return cxosStore.getById(orderId);
}

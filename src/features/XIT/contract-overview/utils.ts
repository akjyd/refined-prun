import { lookupLocalization } from '@src/infrastructure/prun-ui/i18n';
import { fixed0 } from '@src/utils/format';

// Statuses the filter bar offers, in display order.
export const filterableStatuses: PrunApi.ContractStatus[] = [
  'OPEN',
  'CLOSED',
  'PARTIALLY_FULFILLED',
  'DEADLINE_EXCEEDED',
  'FULFILLED',
  'BREACHED',
  'TERMINATED',
  'CANCELLED',
  'REJECTED',
];

// Same set as XIT CONTS: contracts that still need attention.
export const defaultStatuses: PrunApi.ContractStatus[] = [
  'OPEN',
  'CLOSED',
  'PARTIALLY_FULFILLED',
  'DEADLINE_EXCEEDED',
];

export function statusLabel(status: PrunApi.ContractStatus) {
  return lookupLocalization(L.ContractStatus, status)() ?? status;
}

export function statusColor(status: PrunApi.ContractStatus) {
  switch (status) {
    case 'FULFILLED':
      return 'var(--rp-color-green)';
    case 'OPEN':
      return 'var(--rp-color-orange)';
    case 'BREACHED':
    case 'TERMINATED':
    case 'DEADLINE_EXCEEDED':
      return 'var(--rp-color-red)';
    default:
      return undefined;
  }
}

export function sortByDateDesc(a: PrunApi.Contract, b: PrunApi.Contract) {
  return (b.date?.timestamp ?? 0) - (a.date?.timestamp ?? 0);
}

export function conditionProgress(contract: PrunApi.Contract) {
  const total = contract.conditions.length;
  const fulfilled = contract.conditions.filter(x => x.status === 'FULFILLED').length;
  return { fulfilled, total };
}

export function formatMoney(amount: number, currency: string | undefined) {
  if (!currency) {
    return '--';
  }
  return `${fixed0(amount)} ${currency}`;
}

// Sums amounts per currency, so contracts in different currencies are not mixed.
export function addMoney(totals: Map<string, number>, money?: PrunApi.CurrencyAmount) {
  if (!money) {
    return;
  }
  totals.set(money.currency, (totals.get(money.currency) ?? 0) + money.amount);
}

export function formatMoneyTotals(totals: Map<string, number>) {
  if (totals.size === 0) {
    return '--';
  }
  return [...totals.entries()]
    .map(([currency, amount]) => formatMoney(amount, currency))
    .join(' + ');
}

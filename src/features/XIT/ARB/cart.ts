import { fitCart } from '@src/core/arb-cart';
import { shipSizes } from '@src/core/ship-sizes';
import { ArbSnapshot } from '@src/core/arb-batches';
import { ArbPlanResult } from '@src/core/arb-plan';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { userData } from '@src/store/user-data';
import { unitsPerShip } from '@src/core/arbitrage';
import { dailyTrade, planOf } from '@src/features/XIT/ARB/arb-books';

// The XIT ARB cart: goods for one flight on one route. The route is the route of the first
// good; the ship limits the units.

export { dailyTrade };

export type CartItem = (typeof userData.arbCart.items)[number];

// Goods you switched to "offer only" with the button in the depth view or the cart. Kept by
// material and route, so the list and the cart agree (player, 2026-11-07).
const listOnlyRows = reactive(new Set<string>());

export function routeKey(ticker: string, from: string, to: string) {
  return `${ticker}.${from}>${to}`;
}

export function isListOnly(ticker: string, from: string, to: string) {
  const item = userData.arbCart.items.find(x => x.ticker === ticker);
  if (item?.listOnly === true) {
    return true;
  }
  return listOnlyRows.has(routeKey(ticker, from, to));
}

export function toggleListOnly(ticker: string, from: string, to: string) {
  const key = routeKey(ticker, from, to);
  const on = !isListOnly(ticker, from, to);
  if (on) {
    listOnlyRows.add(key);
  } else {
    listOnlyRows.delete(key);
  }
  const item = userData.arbCart.items.find(x => x.ticker === ticker);
  if (item) {
    item.listOnly = on;
  }
}

// What the ship can hold of this material. Nothing else caps a trade: buying more makes the
// wait longer, which the failure rate stops by itself (player, 2026-11-06).
export function unitCap(ticker: string) {
  const material = materialsStore.getByTicker(ticker);
  return material ? unitsPerShip(material.weight, material.volume, cartShip.value) : 0;
}

export const cartShip = computed(
  () => shipSizes.find(x => x.id === userData.arbCart.ship) ?? shipSizes[0],
);

export const cartRoute = computed(() => {
  const first = userData.arbCart.items.at(0);
  return first !== undefined ? { from: first.from, to: first.to } : undefined;
});

export function inCart(ticker: string) {
  return userData.arbCart.items.some(x => x.ticker === ticker);
}

export function addToCart(item: Omit<CartItem, 'units'>, units: number) {
  if (!inCart(item.ticker)) {
    userData.arbCart.items.push({ ...item, units });
  }
}

export function removeFromCart(ticker: string) {
  userData.arbCart.items = userData.arbCart.items.filter(x => x.ticker !== ticker);
}

export function clearCart() {
  userData.arbCart.items = [];
}

// Each good with its units fitted into the ship and the plan at those units.
export const cartLines = computed(() => {
  const items = userData.arbCart.items;
  const goods = items.map(item => {
    const material = materialsStore.getByTicker(item.ticker);
    const market = planOf(
      item.ticker,
      item.from,
      item.to,
      unitCap(item.ticker),
      isListOnly(item.ticker, item.from, item.to),
    );
    return {
      item,
      weight: material?.weight ?? 0,
      volume: material?.volume ?? 0,
      market: market?.plan.units ?? 0,
    };
  });
  const fits = fitCart(
    goods.map(x => ({
      wanted: x.item.units,
      market: x.market,
      weight: x.weight,
      volume: x.volume,
    })),
    cartShip.value,
  );
  return goods.map((good, i) => {
    const { units, max } = fits[i];
    const trade =
      units > 0
        ? planOf(
            good.item.ticker,
            good.item.from,
            good.item.to,
            units,
            isListOnly(good.item.ticker, good.item.from, good.item.to),
          )
        : undefined;
    return { ...good, units, max, plan: trade?.plan };
  });
});

export const cartTotals = computed(() => {
  const lines = cartLines.value;
  const cost = sumBy(lines, x => x.plan?.cost ?? 0);
  const profit = sumBy(lines, x => x.plan?.profit ?? 0);
  const days = lines.filter(x => x.plan).map(x => x.plan!.days);
  return {
    weight: sumBy(lines, x => x.units * x.weight),
    volume: sumBy(lines, x => x.units * x.volume),
    cost,
    profit,
    return: cost > 0 ? profit / cost : 0,
    // The riskiest good decides how the trip as a whole reads.
    failure: Math.max(0, ...lines.filter(x => x.plan).map(x => x.plan!.failure)),
    days: days.length > 0 ? Math.max(...days) : 0,
  };
});

// The orders a trade takes, plus two more on each side, for the batch record.
export function snapshotOf(plan: ArbPlanResult): ArbSnapshot {
  const keep = <T extends { take: number }>(fills: T[]) =>
    fills.slice(0, fills.filter(x => x.take > 0).length + 2);
  const plain = (fills: { price: number; amount?: number; take: number }[]) =>
    keep(fills).map(x => ({ price: x.price, amount: x.amount, take: x.take }));
  return {
    buys: plain(plan.fillsA),
    sells: plan.fillUnits > 0 ? plain(plan.fillsB) : [],
    listPrice: plan.listPrice,
  };
}

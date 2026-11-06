import { fitCart } from '@src/core/arb-cart';
import { shipSizes } from '@src/core/ship-sizes';
import { ArbSnapshot } from '@src/core/arb-batches';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { userData } from '@src/store/user-data';
import { unitsPerShip } from '@src/core/arbitrage';
import { dailyTrade, tradeOf } from '@src/features/XIT/ARB/arb-books';

// The XIT ARB cart: goods for one flight on one route. The route is the route of the first
// good; the ship limits the units.

export type CartItem = (typeof userData.arbCart.items)[number];

// Days of end-exchange trade a good may take at most (player, 2026-11-05: 3 by default).
export const arbDays = ref<'1' | '3' | '7'>('3');

export { dailyTrade };

// The most units a trade may take, before the books: what the ship holds and what the end
// exchange trades in the chosen days, whichever is less (player, 2026-11-06).
export function unitCap(ticker: string, to: string) {
  const material = materialsStore.getByTicker(ticker);
  const ship = material ? unitsPerShip(material.weight, material.volume, cartShip.value) : 0;
  const trade = Math.floor(dailyTrade(ticker, to) * Number(arbDays.value));
  return Math.max(0, Math.min(ship, trade));
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

// Each good with its units fitted into the ship and the trade at those units.
export const cartLines = computed(() => {
  const items = userData.arbCart.items;
  const goods = items.map(item => {
    const material = materialsStore.getByTicker(item.ticker);
    const market = tradeOf(
      item.ticker,
      item.from,
      item.to,
      item.mode,
      unitCap(item.ticker, item.to),
    );
    return {
      item,
      weight: material?.weight ?? 0,
      volume: material?.volume ?? 0,
      market: market?.result.units ?? 0,
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
        ? tradeOf(good.item.ticker, good.item.from, good.item.to, good.item.mode, units)
        : undefined;
    return { ...good, units, max, trade };
  });
});

export const cartTotals = computed(() => {
  const lines = cartLines.value;
  const cost = sumBy(lines, x => x.trade?.result.cost ?? 0);
  const profit = sumBy(lines, x => x.trade?.result.profit ?? 0);
  return {
    weight: sumBy(lines, x => x.units * x.weight),
    volume: sumBy(lines, x => x.units * x.volume),
    cost,
    profit,
    return: cost > 0 ? profit / cost : 0,
  };
});

// The orders a trade takes, plus two more on each side, for the batch record.
export function snapshotOf(result: NonNullable<ReturnType<typeof tradeOf>>['result']): ArbSnapshot {
  const keep = <T extends { take: number }>(fills: T[]) =>
    fills.slice(0, fills.filter(x => x.take > 0).length + 2);
  const plain = (fills: { price: number; amount?: number; take: number }[]) =>
    keep(fills).map(x => ({ price: x.price, amount: x.amount, take: x.take }));
  return {
    buys: plain(result.fillsA),
    sells: result.fillsB.some(x => x.take > 0) ? plain(result.fillsB) : [],
    listPrice: result.fillsB.some(x => x.take > 0) ? undefined : result.sell,
  };
}

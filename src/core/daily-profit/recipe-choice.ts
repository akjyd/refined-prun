import { dailyProfit, PriceFn, Recipe } from '@src/core/daily-profit/daily-profit';
import { cxStore } from '@src/infrastructure/fio/cx';
import { useProfitData } from '@src/infrastructure/prunplanner/profit-data';
import { userData } from '@src/store/user-data';

// 30-day VWAP of the exchange, then its 7-day VWAP, then the all-exchange 30-day VWAP.
// UNIVERSE gives the all-exchange average.
export function exchangePrice(exchange: string): PriceFn {
  return ticker => {
    if (!cxStore.fetched) {
      return undefined;
    }
    const info = cxStore.prices.get(exchange)?.get(ticker);
    const universe = cxStore.prices.get('UNIVERSE')?.get(ticker);
    return info?.VWAP30D ?? info?.VWAP7D ?? universe?.VWAP30D ?? universe?.VWAP7D ?? undefined;
  };
}

export function withPrice(price: PriceFn, ticker: string, value: number): PriceFn {
  return t => (t === ticker ? value : price(t));
}

export function recipesFor(ticker: string): Recipe[] {
  return useProfitData().byOutput.get(ticker) ?? [];
}

export function profitOf(recipe: Recipe, price: PriceFn) {
  return dailyProfit(useProfitData().data, recipe, price);
}

// The recipe with the highest daily profit at the all-exchange prices.
export function bestRecipe(ticker: string) {
  const price = exchangePrice('UNIVERSE');
  let best: Recipe | undefined;
  let bestProfit = -Infinity;
  for (const recipe of recipesFor(ticker)) {
    const profit = profitOf(recipe, price) ?? -Infinity;
    if (best === undefined || profit > bestProfit) {
      best = recipe;
      bestProfit = profit;
    }
  }
  return best;
}

// The recipe picked in XIT RECIPES, else the best one.
export function chosenRecipe(ticker: string) {
  const key = userData.recipeChoices[ticker];
  const picked = key !== undefined ? recipesFor(ticker).find(x => x.key === key) : undefined;
  return picked ?? bestRecipe(ticker);
}

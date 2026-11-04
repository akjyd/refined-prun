import { dailyProfit, isMainProduct, PriceFn, Recipe } from '@src/core/daily-profit/daily-profit';
import { cxStore } from '@src/infrastructure/fio/cx';
import { useProfitData } from '@src/infrastructure/prunplanner/profit-data';
import { userData } from '@src/store/user-data';

// 7-day VWAP of the exchange, then its 30-day VWAP, then the all-exchange VWAPs.
// UNIVERSE gives the all-exchange average.
export function exchangePrice(exchange: string): PriceFn {
  return ticker => {
    if (!cxStore.fetched) {
      return undefined;
    }
    const info = cxStore.prices.get(exchange)?.get(ticker);
    const universe = cxStore.prices.get('UNIVERSE')?.get(ticker);
    return info?.VWAP7D ?? info?.VWAP30D ?? universe?.VWAP7D ?? universe?.VWAP30D ?? undefined;
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

// The recipe with the highest daily profit at the all-exchange prices, among the recipes
// where the material is the main product. All recipes count when there is no such recipe.
export function bestRecipe(ticker: string) {
  const price = exchangePrice('UNIVERSE');
  const all = recipesFor(ticker);
  const main = all.filter(x => isMainProduct(x, ticker, price));
  let best: Recipe | undefined;
  let bestProfit = -Infinity;
  for (const recipe of main.length > 0 ? main : all) {
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

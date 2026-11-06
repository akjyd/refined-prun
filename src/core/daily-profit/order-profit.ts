import {
  chosenRecipe,
  exchangePrice,
  profitOf,
  withPrice,
} from '@src/core/daily-profit/recipe-choice';
import { extractionProfit, PlanetInfo, ResourceSite } from '@src/core/extraction/extraction';
import { watchedPlanetsOf } from '@src/core/extraction/watched-planets';
import { useProfitData } from '@src/infrastructure/prunplanner/profit-data';
import { getLiveCogc, requestLiveCogc } from '@src/infrastructure/fio/planet-info';
import { userData } from '@src/store/user-data';

// The daily profit at an order price, the same way in CXOB, XIT CX4 and XIT ORDERS.
// A made material uses the recipe picked in XIT RECIPES. A raw material uses an extraction
// base on the planet picked for this order book; until a planet is picked it shows "--".

interface ExtractionData {
  resources: Record<string, ResourceSite[]>;
  planets: Record<string, [string, number, number, number, number, string]>;
}

const extraction = shallowRef<ExtractionData>();
let loading = false;

function useExtractionData() {
  if (!loading) {
    loading = true;
    void (async () => {
      const module = await import('@src/core/extraction/extraction-data.json');
      extraction.value = module.default as unknown as ExtractionData;
    })();
  }
  return extraction.value;
}

export function planetInfo(id: string): PlanetInfo | undefined {
  const p = useExtractionData()?.planets[id];
  if (!p) {
    return undefined;
  }
  const [name, rocky, gravity, pressure, temperature, cogc] = p;
  return {
    name,
    rocky: rocky === 1,
    gravity,
    pressure,
    temperature,
    cogc: getLiveCogc(id) ?? cogc,
  };
}

export function planetName(id: string) {
  const name = planetInfo(id)?.name;
  return name !== undefined && name !== '' ? name : id;
}

export function isRaw(ticker: string) {
  return useProfitData().data.extractable.has(ticker);
}

// Planets to pick from: your watched planets for the resource.
export function planetOptions(ticker: string) {
  return watchedPlanetsOf(ticker);
}

export function chosenPlanet(ticker: string, exchange: string) {
  const picked = userData.extractPlanets[`${ticker}.${exchange}`];
  const options = planetOptions(ticker);
  return picked !== undefined && options.includes(picked) ? picked : undefined;
}

// An empty planet clears the choice.
export function pickPlanet(ticker: string, exchange: string, planet: string) {
  const key = `${ticker}.${exchange}`;
  if (planet === '') {
    delete userData.extractPlanets[key];
  } else {
    userData.extractPlanets[key] = planet;
  }
}

// Returns the daily profit for an order price, or undefined when it cannot be computed.
export function orderProfit(ticker: string, exchange: string) {
  const base = exchangePrice(exchange);
  if (!isRaw(ticker)) {
    const recipe = chosenRecipe(ticker);
    return (price: number) =>
      recipe ? profitOf(recipe, withPrice(base, ticker, price)) : undefined;
  }
  const id = chosenPlanet(ticker, exchange);
  const site =
    id !== undefined ? useExtractionData()?.resources[ticker]?.find(x => x[0] === id) : undefined;
  const planet = id !== undefined ? planetInfo(id) : undefined;
  if (id !== undefined) {
    requestLiveCogc([id]);
  }
  const data = useProfitData().data;
  return (price: number) =>
    site && planet
      ? extractionProfit(data, ticker, site, planet, withPrice(base, ticker, price)).profit
      : undefined;
}

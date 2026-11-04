import {
  embeddedProfitData,
  ProfitData,
  Recipe,
  recipeKey,
  recipesByOutput,
} from '@src/core/daily-profit/daily-profit';

// Recipes and buildings come from the public PRUNplanner API. The optimal base layouts and the
// workforce needs are not in the API, so they always come from the embedded snapshot. When the
// API cannot be reached, the embedded snapshot (2026-11-04) is used for everything.

interface PlannerMaterial {
  material_ticker: string;
  material_amount: number;
}

interface PlannerRecipe {
  building_ticker: string;
  time_ms: number;
  inputs: PlannerMaterial[];
  outputs: PlannerMaterial[];
}

interface PlannerBuilding {
  building_ticker: string;
  pioneers: number;
  settlers: number;
  technicians: number;
  engineers: number;
  scientists: number;
  area_cost: number;
  expertise: string | null;
  costs: PlannerMaterial[];
  building_type: string;
}

const baseUrl = 'https://api.prunplanner.org';
const extractors = new Set(['EXT', 'RIG', 'COL']);

export const profitDataStore = shallowReactive({
  data: embeddedProfitData,
  byOutput: recipesByOutput(embeddedProfitData),
  fromPlanner: false,
});

let requested = false;

function toAmounts(list: PlannerMaterial[]) {
  const amounts: Record<string, number> = {};
  for (const x of list) {
    amounts[x.material_ticker] = (amounts[x.material_ticker] ?? 0) + x.material_amount;
  }
  return amounts;
}

function convert(recipes: PlannerRecipe[], buildings: PlannerBuilding[]): ProfitData | undefined {
  const production = buildings.filter(
    x => x.building_type === 'PRODUCTION' && !extractors.has(x.building_ticker),
  );
  if (production.length < 30) {
    return undefined;
  }
  const result: ProfitData = {
    recipes: [],
    buildings: {},
    needs: embeddedProfitData.needs,
    optimal: embeddedProfitData.optimal,
    extractable: embeddedProfitData.extractable,
  };
  for (const b of production) {
    result.buildings[b.building_ticker] = {
      workers: [b.pioneers, b.settlers, b.technicians, b.engineers, b.scientists],
      area: b.area_cost,
      costs: toAmounts(b.costs),
      expertise: b.expertise ?? '',
    };
  }
  for (const r of recipes) {
    if (result.buildings[r.building_ticker] === undefined || r.outputs.length === 0) {
      continue;
    }
    const inputs = toAmounts(r.inputs);
    const outputs = toAmounts(r.outputs);
    const recipe: Recipe = {
      key: recipeKey(r.building_ticker, inputs, outputs),
      building: r.building_ticker,
      hours: r.time_ms / 3_600_000,
      inputs,
      outputs,
    };
    result.recipes.push(recipe);
  }
  return result.recipes.length > 200 ? result : undefined;
}

async function getJson<T>(path: string) {
  const response = await fetch(baseUrl + path);
  if (!response.ok) {
    throw new Error(`${path}: ${response.status}`);
  }
  return (await response.json()) as T;
}

async function fetchPlannerData() {
  try {
    const [recipes, buildings] = await Promise.all([
      getJson<PlannerRecipe[]>('/data/recipes/'),
      getJson<PlannerBuilding[]>('/data/buildings/'),
    ]);
    const data = convert(recipes, buildings);
    if (data) {
      profitDataStore.data = data;
      profitDataStore.byOutput = recipesByOutput(data);
      profitDataStore.fromPlanner = true;
    }
  } catch (e) {
    console.warn('PRUNplanner data not available, using the embedded snapshot.', e);
  }
}

// Requests the PRUNplanner data again (refresh button).
export function refreshProfitData() {
  requested = true;
  void fetchPlannerData();
}

// Starts the API request once; the embedded data is used until it arrives.
export function useProfitData() {
  if (!requested) {
    requested = true;
    void fetchPlannerData();
  }
  return profitDataStore;
}

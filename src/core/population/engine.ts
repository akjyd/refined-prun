// Population forecast for the POPR window.
// Ported from "州长助手中文版" (a governor helper page), whose rules were checked against game data:
// needs and weights follow Archiel's Governor Helper sheet; happiness and population change
// follow the game's own results (open jobs raise happiness, forecasts use average happiness).

export const TIERS = ['PIONEER', 'SETTLER', 'TECHNICIAN', 'ENGINEER', 'SCIENTIST'] as const;
export type Tier = (typeof TIERS)[number];
export type PerTier = Record<Tier, number>;

export const NEEDS = [
  'LIFE_SUPPORT',
  'SAFETY',
  'HEALTH',
  'COMFORT',
  'CULTURE',
  'EDUCATION',
] as const;
export type Need = (typeof NEEDS)[number];

// Need weights per tier, in NEEDS order.
const WEIGHTS: Record<Tier, number[]> = {
  PIONEER: [0.54, 0.25, 0.15, 0.03, 0.02, 0.01],
  SETTLER: [0.41, 0.3, 0.2, 0.03, 0.03, 0.03],
  TECHNICIAN: [0.15, 0.2, 0.3, 0.2, 0.1, 0.05],
  ENGINEER: [0.1, 0.1, 0.15, 0.35, 0.2, 0.1],
  SCIENTIST: [0.05, 0.1, 0.1, 0.2, 0.25, 0.3],
};

// Each player base gives this many safety and health points.
export const BASE_POINTS = 50;

// Government programs: [base cost, population cost, happiness, education, immigrants].
const FESTIVITIES: Record<string, number> = {
  FESTIVITIES_1: 0.05,
  FESTIVITIES_2: 0.1,
  FESTIVITIES_3: 0.2,
};
const EDUCATION_PROGRAM: Record<string, number> = {
  EDUCATION_1: 0.5,
  EDUCATION_2: 0.75,
  EDUCATION_3: 1,
};
const IMMIGRATION: Record<string, [Tier, number]> = {
  IMMIGRATION_PIONEER: ['PIONEER', 500],
  IMMIGRATION_SETTLER: ['SETTLER', 200],
  IMMIGRATION_TECHNICIAN: ['TECHNICIAN', 100],
  IMMIGRATION_ENGINEER: ['ENGINEER', 50],
  IMMIGRATION_SCIENTIST: ['SCIENTIST', 25],
};
// Emigration factor per tier, and education rate into each tier.
const MIGRATION_OUT: PerTier = {
  PIONEER: 0.4,
  SETTLER: 0.4444444444444444,
  TECHNICIAN: 0.5,
  ENGINEER: 2 / 3,
  SCIENTIST: 0.8,
};
const EDUCATION_IN: Partial<PerTier> = {
  SETTLER: 0.025,
  TECHNICIAN: 0.02,
  ENGINEER: 0.0125,
  SCIENTIST: 0.0075,
};
// Education rate added by each level of an education building.
const EDUCATION_BUILDINGS: Record<string, number> = { PBH: 0.001, LIB: 0.002, UNI: 0.003 };
// Weights of the last five weeks in the average happiness.
const AVERAGE_WEIGHTS = [0.4, 0.25, 0.2, 0.1, 0.05];

export interface Report {
  timestamp: number;
  explorersGrace: boolean;
  population: PerTier;
  happiness: PerTier;
  unemployment: PerTier;
  openJobs: PerTier;
  // In NEEDS order, capped at 1 by the game.
  fulfillment: number[];
  program: string | null;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const perTier = (f: (t: Tier) => number) =>
  Object.fromEntries(TIERS.map(t => [t, f(t)])) as PerTier;

// Points each need requires: population of each tier times its weight.
export function requiredNeeds(population: PerTier) {
  return NEEDS.map((_, i) => sumBy([...TIERS], t => population[t] * WEIGHTS[t][i]));
}

// The game counts open jobs as negative unemployment: -openJobs / previous population.
function effectiveUnemployment(reports: Report[], i: number) {
  const r = reports[i];
  const prev = i > 0 ? reports[i - 1] : undefined;
  return perTier(t => {
    if (prev === undefined || r.openJobs[t] <= 0) {
      return r.unemployment[t];
    }
    return prev.population[t] === 0 ? -100 : -r.openJobs[t] / prev.population[t];
  });
}

// Happiness of one week from need fulfillment and unemployment.
// Open jobs raise happiness by up to 30%.
export function weekHappiness(tier: Tier, fulfillment: number[], u: number, grace: boolean) {
  let happiness = grace ? 0.5 : 0;
  happiness += sumBy(
    WEIGHTS[tier].map((w, i) => Math.min(1, fulfillment[i]) * w),
    x => x,
  );
  if (-u > 0.3 * happiness) {
    happiness *= 1.3;
  } else {
    happiness -= u;
  }
  return clamp01(happiness);
}

// Missing weeks do not count; the weights of the present weeks are normalized.
function weighted(values: number[]) {
  const w = AVERAGE_WEIGHTS.slice(0, values.length);
  return (
    sumBy(
      values.map((h, i) => h * w[i]),
      x => x,
    ) / sumBy(w, x => x)
  );
}

const festivities = (programs: (string | null)[]) =>
  sumBy(programs, p => (p !== null ? (FESTIVITIES[p] ?? 0) : 0));

interface HistoryEntry {
  // Week happiness of this and earlier weeks, newest first, at most 5.
  recent: PerTier[];
  // Shown average happiness minus the model value.
  offset: PerTier;
}

function history(reports: Report[], idx: number): HistoryEntry {
  const weeks: PerTier[] = [];
  let offset = perTier(() => 0);
  for (let i = 0; i <= idx; i++) {
    const r = reports[i];
    const u = effectiveUnemployment(reports, i);
    weeks.unshift(perTier(t => weekHappiness(t, r.fulfillment, u[t], r.explorersGrace)));
    const fest = festivities([r.program]);
    offset = perTier(t => {
      const model = clamp01(weighted(weeks.slice(0, 5).map(x => x[t])) + fest);
      return r.happiness[t] - model;
    });
  }
  return { recent: weeks.slice(0, 5), offset };
}

export interface TierForecast {
  change: number;
  next: number;
  averageHappiness: number;
}

// Population change in the next report.
// nextFulfillment: need fulfillment expected next week (NEEDS order, capped).
// levels: infrastructure levels by ticker (education buildings matter).
// program: the government program that runs next week, if any.
export function forecast(
  reports: Report[],
  idx: number,
  nextFulfillment: number[],
  levels: Record<string, number>,
  program: string | null = null,
): Record<Tier, TierForecast> {
  const r = reports[idx];
  const past = history(reports, idx);
  const programs = program ? [program] : [];
  const fest = festivities(programs);
  const eduBonus = Math.max(0, ...programs.map(p => EDUCATION_PROGRAM[p] ?? 0));
  const buildingRate = sumBy(
    Object.entries(EDUCATION_BUILDINGS),
    ([ticker, v]) => (levels[ticker] ?? 0) * v,
  );
  const pop = r.population;
  // Assume the number of jobs stays the same.
  const jobs = perTier(t => pop[t] * (1 - Math.max(0, r.unemployment[t])) + r.openJobs[t]);

  let next = { ...pop };
  let result = {} as Record<Tier, TierForecast>;
  // Population and unemployment depend on each other: iterate until stable.
  for (let iteration = 0; iteration < 50; iteration++) {
    const average = perTier(t => {
      const n = next[t];
      const u =
        n >= jobs[t]
          ? n > 0
            ? (n - jobs[t]) / n
            : 0
          : pop[t] > 0
            ? -(jobs[t] - n) / pop[t]
            : -100;
      const h = weekHappiness(t, nextFulfillment, u, r.explorersGrace);
      const model = clamp01(weighted([h, ...past.recent.slice(0, 4).map(x => x[t])]) + fest);
      const offset = Number.isFinite(past.offset[t]) && pop[t] > 0 ? past.offset[t] : 0;
      return clamp01(model + offset);
    });
    const change = perTier(() => 0);
    for (let i = 1; i < TIERS.length; i++) {
      const t = TIERS[i];
      const lower = TIERS[i - 1];
      const rate = (buildingRate + (EDUCATION_IN[t] ?? 0)) * (1 + eduBonus);
      const educated = pop[lower] * rate * average[t];
      change[t] += educated;
      change[lower] -= educated;
    }
    for (const t of ['PIONEER', 'SETTLER', 'TECHNICIAN'] as Tier[]) {
      change[t] += Math.max(0, average[t] - 0.7) * pop[t];
    }
    for (const t of TIERS) {
      change[t] -= Math.max(0, 0.5 - average[t]) * MIGRATION_OUT[t] * pop[t];
    }
    for (const p of programs) {
      const immigration = IMMIGRATION[p];
      if (immigration !== undefined) {
        change[immigration[0]] += immigration[1];
      }
    }
    let moved = 0;
    result = {} as Record<Tier, TierForecast>;
    for (const t of TIERS) {
      const value = Math.max(0, pop[t] + change[t]);
      moved = Math.max(moved, Math.abs(value - next[t]));
      result[t] = { change: change[t], next: value, averageHappiness: average[t] };
    }
    next = perTier(t => result[t].next);
    if (moved < 1e-6) {
      break;
    }
  }
  return result;
}

// Comfort and culture cannot exceed safety or health; education cannot exceed comfort or culture.
export function capFulfillment(raw: number[]) {
  const c = raw.map(x => Math.min(1, x));
  c[3] = Math.min(c[1], c[2], c[3]);
  c[4] = Math.min(c[1], c[2], c[4]);
  c[5] = Math.min(c[3], c[4], c[5]);
  return c;
}

export interface NeedSupply {
  // Uncapped fulfillment; a lower bound when exact is false.
  value: number;
  exact: boolean;
}

// Uncapped need fulfillment of a report, from the points that were supplied.
// The game reports fulfillment against the population of the previous report, capped at 1,
// with the share of each source. A base gives BASE_POINTS of safety and health, so the base
// share gives the total supply of these two needs. Other needs are exact only below 100%.
export function supplyOf(
  report: Report & { shares: { source: string; need: string; fulfillment: number }[] },
  previousPopulation: PerTier,
  bases: number | undefined,
) {
  const required = requiredNeeds(previousPopulation);
  return NEEDS.map((need, i): { supplied: number; exact: boolean } => {
    const capped = report.fulfillment[i];
    const baseShare = report.shares.find(x => x.source === 'BASE' && x.need === need)?.fulfillment;
    if (bases !== undefined && bases > 0 && baseShare !== undefined && baseShare > 0) {
      return { supplied: (bases * BASE_POINTS) / baseShare, exact: true };
    }
    return { supplied: capped * required[i], exact: capped < 1 - 1e-9 };
  });
}

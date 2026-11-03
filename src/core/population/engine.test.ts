import { describe, expect, it } from 'vitest';
import {
  capFulfillment,
  forecast,
  NEEDS,
  PerTier,
  Report,
  requiredNeeds,
  supplyOf,
  TIERS,
  weekHappiness,
} from './engine';
import data from './zv-639a.test-data.json';

// ZV-639a population reports captured from the game (2026-11-03), 4 player bases.
type Raw = (typeof data.reports)[number];

function toReport(
  r: Raw,
): Report & { change: PerTier; shares: { source: string; need: string; fulfillment: number }[] } {
  const tiers = (x: Record<string, number>) => x as PerTier;
  return {
    timestamp: r.time.timestamp,
    explorersGrace: r.explorersGraceEnabled,
    population: tiers(r.nextPopulation),
    change: tiers(r.populationDifference),
    happiness: tiers(r.averageHappiness),
    unemployment: tiers(r.unemploymentRate),
    openJobs: tiers(r.openJobs),
    fulfillment: NEEDS.map(n => (r.needFulfillment as Record<string, number>)[n]),
    program: r.governmentProgramType,
    shares: r.needFulfillments.map(x => ({
      source: x.infrastructureType,
      need: x.needType,
      fulfillment: x.fulfillment,
    })),
  };
}

const reports = data.reports.map(toReport);
const levels = Object.fromEntries(data.infrastructure.map(x => [x.ticker, x.level]));

describe('population engine', () => {
  it('computes the required need points', () => {
    const required = requiredNeeds({
      PIONEER: 0,
      SETTLER: 100,
      TECHNICIAN: 0,
      ENGINEER: 0,
      SCIENTIST: 0,
    });
    expect(required[1]).toBeCloseTo(30);
  });

  it('caps fulfillment like the game', () => {
    expect(capFulfillment([1, 0.5, 2, 2, 2, 2])).toEqual([1, 0.5, 1, 0.5, 0.5, 0.5]);
  });

  it('adds the open-jobs bonus to happiness', () => {
    const full = [1, 1, 1, 1, 1, 1];
    expect(weekHappiness('SETTLER', full, 0, false)).toBeCloseTo(1);
    expect(weekHappiness('SETTLER', [1, 0, 0, 0, 0, 0], -0.5, false)).toBeCloseTo(0.41 * 1.3);
  });

  it('matches the game fulfillment when the bases are the only source', () => {
    // Period 75: safety and health come only from the 4 bases (50 points each).
    const i = reports.findIndex(
      r => r.timestamp === data.reports.find(x => x.simulationPeriod === 75)!.time.timestamp,
    );
    const supply = supplyOf(reports[i], reports[i - 1].population, 4);
    const required = requiredNeeds(reports[i - 1].population);
    expect(supply[1].supplied / required[1]).toBeCloseTo(reports[i].fulfillment[1], 3);
    expect(supply[2].supplied / required[2]).toBeCloseTo(reports[i].fulfillment[2], 3);
  });

  it('forecasts the population change close to the game', () => {
    let error = 0;
    let total = 0;
    for (let i = 20; i < reports.length; i++) {
      const result = forecast(reports, i - 1, reports[i].fulfillment, levels, reports[i].program);
      for (const t of TIERS) {
        error += Math.abs(result[t].change - reports[i].change[t]);
        total += Math.abs(reports[i].change[t]);
      }
    }
    console.log(`forecast error ${error.toFixed(0)} of total change ${total.toFixed(0)}`);
    expect(error).toBeLessThan(total);
  });
});

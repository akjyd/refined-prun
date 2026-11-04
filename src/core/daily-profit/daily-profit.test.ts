import { describe, expect, it } from 'vitest';
import {
  isMainProduct,
  dailyProfit,
  embeddedProfitData,
  recipeKey,
  recipesByOutput,
} from '@src/core/daily-profit/daily-profit';
import prices from './ai1-prices.test-data.json';

// AI1 30-day VWAP from the production cost page snapshot (2026-11-04).
const table = prices as Record<string, number>;
const price = (t: string) => table[t];
const byOutput = recipesByOutput(embeddedProfitData);

function profit(key: string, override?: Record<string, number>) {
  const recipe = embeddedProfitData.recipes.find(x => x.key === key)!;
  return dailyProfit(embeddedProfitData, recipe, t => override?.[t] ?? price(t));
}

// Expected values come from the production cost page (500 area daily profit).
describe('dailyProfit', () => {
  it('matches the cost page for AL', () => {
    expect(profit('AML:2xBER=>1xAL 1xBE 1xSIO')).toBeCloseTo(197043, -1);
    expect(profit('SME:6xALO 1xC 1xFLX 1xO=>4xAL')).toBeCloseTo(94183, -1);
  });

  it('uses the given price for the target', () => {
    expect(profit('FP:2xFIM 1xMTP=>2xMEA')).toBeCloseTo(118550, -1);
    expect(profit('FP:2xFIM 1xMTP=>2xMEA', { MEA: 5600 })).toBeCloseTo(162924, -1);
  });

  it('builds stable keys', () => {
    expect(recipeKey('SME', { O: 1, C: 1 }, { AL: 3 })).toBe('SME:1xC 1xO=>3xAL');
    expect(byOutput.get('AL')?.length).toBe(3);
  });

  it('treats extracted materials as raw', () => {
    expect(byOutput.get('SIO')).toBeUndefined();
    expect(byOutput.get('O')).toBeUndefined();
  });

  it('finds the main product', () => {
    const aml = embeddedProfitData.recipes.find(x => x.key === 'AML:2xBER=>1xAL 1xBE 1xSIO')!;
    expect(isMainProduct(aml, 'AL', price)).toBe(false);
    expect(isMainProduct(aml, 'BE', price)).toBe(true);
  });
});

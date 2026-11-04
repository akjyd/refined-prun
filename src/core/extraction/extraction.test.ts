import { describe, expect, it } from 'vitest';
import { embeddedProfitData } from '@src/core/daily-profit/daily-profit';
import {
  extractionProfit,
  jumpsFrom,
  PlanetInfo,
  ResourceSite,
} from '@src/core/extraction/extraction';
import data from './extraction-data.json';
import prices from './ai1-prices-7d.test-data.json';

// AI1 7-day VWAP from the production cost page snapshot (2026-11-04).
const table = prices as Record<string, number>;
const price = (t: string) => table[t];
const resources = data.resources as unknown as Record<string, ResourceSite[]>;
const planets = data.planets as unknown as Record<
  string,
  [string, number, number, number, number, string]
>;

function planet(id: string): PlanetInfo {
  const [name, rocky, gravity, pressure, temperature, cogc] = planets[id];
  return { name, rocky: rocky === 1, gravity, pressure, temperature, cogc };
}

function result(ticker: string, id: string) {
  const site = resources[ticker].find(x => x[0] === id)!;
  return extractionProfit(embeddedProfitData, ticker, site, planet(id), price);
}

// Expected values come from the production cost page engine.
describe('extractionProfit', () => {
  it('matches the cost page', () => {
    const amm = result('AMM', 'AM-528g');
    expect(amm.building).toBe('RIG');
    expect(amm.output).toBeCloseTo(1816, -1);
    expect(amm.profit).toBeCloseTo(263000, -2);
    expect(result('H2O', 'FK-794b').profit).toBeCloseTo(141598, -2);
    // Dodai: cold and thin air, so INS and SEA are added.
    expect(result('BER', 'YI-280j').profit).toBeCloseTo(155263, -2);
    // No COGC bonus on a metallurgy planet.
    expect(result('ALO', 'BI-500b').profit).toBeCloseTo(92418, -2);
  });
});

describe('jumpsFrom', () => {
  it('counts jumps', () => {
    const map = new Map([
      ['A', ['B']],
      ['B', ['A', 'C']],
      ['C', ['B']],
    ]);
    expect(jumpsFrom('A', map).get('C')).toBe(2);
  });
});

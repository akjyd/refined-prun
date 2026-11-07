import { describe, expect, it } from 'vitest';
import { planTrade } from '@src/core/arb-plan';
import { failureRate } from '@src/core/arb-risk';

const base = {
  flightDays: 1,
  dailyTrade: 100,
  volatility: 0.02,
  failurePercent: 10,
  maxUnits: 10_000,
  maxDays: 30,
};

describe('planTrade', () => {
  it('fills what the requests take and lists the rest', () => {
    const r = planTrade({
      ...base,
      asksA: [
        { price: 100, amount: 50 },
        { price: 105, amount: 50 },
      ],
      bidsB: [{ price: 140, amount: 50 }],
      asksB: [{ price: 160, amount: 10 }],
    })!;
    expect(r.fillUnits).toBe(50);
    expect(r.listUnits).toBeGreaterThan(0);
    expect(r.listPrice).toBeLessThan(160);
    expect(r.units).toBe(r.fillUnits + r.listUnits);
  });

  it('leaves an offer that earns too little', () => {
    // 99 against a request of 100 is 1%: far under what one day of 2% moves asks for.
    const r = planTrade({
      ...base,
      asksA: [
        { price: 80, amount: 10 },
        { price: 99, amount: 10 },
      ],
      bidsB: [{ price: 100, amount: 100 }],
      asksB: [{ price: 101, amount: 10 }],
    })!;
    expect(r.units).toBe(10);
    expect(r.limit).toBe('risk');
  });

  it('takes less when less risk is allowed', () => {
    const books = {
      asksA: [
        { price: 100, amount: 40 },
        { price: 110, amount: 40 },
        { price: 120, amount: 40 },
      ],
      bidsB: [{ price: 150, amount: 200 }],
      asksB: [{ price: 180, amount: 10 }],
    };
    const loose = planTrade({ ...base, ...books, failurePercent: 25 })!;
    const tight = planTrade({ ...base, ...books, failurePercent: 3 })!;
    expect(tight.units).toBeLessThanOrEqual(loose.units);
  });

  it('stops at the ship', () => {
    const r = planTrade({
      ...base,
      maxUnits: 30,
      asksA: [{ price: 100, amount: 500 }],
      bidsB: [{ price: 150, amount: 500 }],
      asksB: [{ price: 180, amount: 10 }],
    })!;
    expect(r.units).toBe(30);
    expect(r.limit).toBe('ship');
  });

  it('does not list when the end exchange trades nothing', () => {
    const r = planTrade({
      ...base,
      dailyTrade: 0,
      asksA: [{ price: 100, amount: 500 }],
      bidsB: [{ price: 150, amount: 20 }],
      asksB: [{ price: 180, amount: 10 }],
    })!;
    expect(r.listUnits).toBe(0);
    expect(r.units).toBe(20);
  });

  it('keeps the failure rate it was asked for', () => {
    const r = planTrade({
      ...base,
      asksA: [
        { price: 100, amount: 40 },
        { price: 118, amount: 400 },
      ],
      bidsB: [{ price: 150, amount: 40 }],
      asksB: [{ price: 130, amount: 10 }],
    })!;
    expect(r.failure).toBeLessThanOrEqual(10.0001);
    expect(failureRate(r.margin, base.volatility, r.days)).toBeCloseTo(r.failure, 6);
  });

  it('waits no longer than you allow', () => {
    const r = planTrade({
      ...base,
      maxDays: 3,
      asksA: [{ price: 100, amount: 5000 }],
      bidsB: [{ price: 150, amount: 10 }],
      asksB: [{ price: 300, amount: 10 }],
    })!;
    // 10 filled at once, then two days of trade at 100 a day.
    expect(r.listUnits).toBe(200);
    expect(r.limit).toBe('days');
  });

  it('weighs the days by the money each part holds', () => {
    const r = planTrade({
      ...base,
      asksA: [{ price: 100, amount: 400 }],
      bidsB: [{ price: 150, amount: 100 }],
      asksB: [{ price: 180, amount: 10 }],
    })!;
    expect(r.days).toBeGreaterThan(base.flightDays);
    expect(r.days).toBeLessThan(r.listDays);
  });
});

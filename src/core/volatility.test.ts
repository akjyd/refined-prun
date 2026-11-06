import { describe, expect, it } from 'vitest';
import { dailyVolatility, flightDays, safetyMultiple, tradeDays } from '@src/core/volatility';

describe('volatility', () => {
  it('is the standard deviation of daily changes', () => {
    // Changes: +10%, -10%, +10%, -10%, +10%.
    const closes = [100, 110, 99, 108.9, 98.01, 107.811];
    expect(dailyVolatility(closes)).toBeCloseTo(0.1095, 3);
    expect(dailyVolatility([100, 101])).toBeUndefined();
  });

  it('uses 2 days for the diagonals', () => {
    expect(flightDays('AI1', 'NC1')).toBe(2);
    expect(flightDays('AI1', 'IC1')).toBe(1);
    expect(safetyMultiple(0.04, 0.02, 1)).toBeCloseTo(2);
    expect(safetyMultiple(0.04, 0.02, 4)).toBeCloseTo(1);
  });
});

describe('tradeDays', () => {
  it('is the flight days for a fill', () => {
    expect(tradeDays('AI1', 'IC1', false, 500, 100)).toBe(1);
    expect(tradeDays('AI1', 'NC1', false, 500, 100)).toBe(2);
  });

  it('adds units over daily trade for a listed sale', () => {
    expect(tradeDays('AI1', 'NC1', true, 300, 100)).toBe(5);
  });

  it('is undefined for a listed sale with no trade', () => {
    expect(tradeDays('AI1', 'IC1', true, 300, 0)).toBeUndefined();
  });
});

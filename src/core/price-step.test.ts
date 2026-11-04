import { describe, expect, it } from 'vitest';
import { dropPrice, priceStep } from '@src/core/price-step';

describe('priceStep', () => {
  it('keeps three significant digits', () => {
    expect(priceStep(200)).toBe(1);
    expect(priceStep(1000)).toBe(10);
    expect(priceStep(35000)).toBe(100);
    expect(priceStep(13.8)).toBeCloseTo(0.1);
  });
});

describe('dropPrice', () => {
  it('places offers under the order above and requests over the order below', () => {
    expect(dropPrice(true, 35000, 33000)).toBe(34900);
    expect(dropPrice(false, 35000, 33000)).toBe(33100);
    // Just under 1,000 the step is 1.
    expect(dropPrice(true, 1000, 900)).toBe(999);
  });
});

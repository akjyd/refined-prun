import { describe, expect, it } from 'vitest';
import { planResupply, ResupplyInput } from '@src/core/ship-resupply';
import { MaterialBurn } from '@src/core/burn';

function burn(values: Partial<MaterialBurn>): MaterialBurn {
  return {
    input: 0,
    output: 0,
    workforce: 0,
    dailyAmount: 0,
    remainingAllocation: 0,
    inventory: 0,
    inboundInventory: 0,
    daysLeft: Number.POSITIVE_INFINITY,
    type: 'input',
    ...values,
  };
}

const big = { weight: 1e6, volume: 1e6 };

const base: ResupplyInput = {
  burn: {
    RAT: burn({ workforce: 10, dailyAmount: -10, inventory: 20, type: 'workforce' }),
    DW: burn({ output: 50, input: 10, dailyAmount: 40, inventory: 100, type: 'output' }),
    PE: burn({ output: 20, dailyAmount: 20, inventory: 60, type: 'output' }),
  },
  onShip: { RAT: 500 },
  sizes: {
    RAT: { ticker: 'RAT', weight: 0.21, volume: 0.1 },
    DW: { ticker: 'DW', weight: 0.1, volume: 0.1 },
    PE: { ticker: 'PE', weight: 1, volume: 1 },
  },
  intermediateDays: 5,
  baseSpace: big,
  shipSpace: big,
};

describe('planResupply', () => {
  it('unloads everything when no days are set', () => {
    expect(planResupply(base).toBase).toEqual({ RAT: 500 });
  });

  it('tops the base up to the days set', () => {
    // 30 days of 10 a day is 300, and 20 are there.
    expect(planResupply({ ...base, supplyDays: 30 }).toBase).toEqual({ RAT: 280 });
  });

  it('leaves the days of an intermediate and loads the rest', () => {
    // DW is made and used here: 5 days of 10 a day stay, 50 are loaded. PE is only made.
    expect(planResupply(base).toShip).toEqual({ DW: 50, PE: 60 });
  });

  it('puts what the base cannot hold in the warehouse', () => {
    const r = planResupply({
      ...base,
      baseSpace: { weight: 21, volume: 1e6 },
      warehouseSpace: big,
    });
    expect(r.toBase).toEqual({ RAT: 100 });
    expect(r.toWarehouse).toEqual({ RAT: 400 });
    expect(r.baseFull).toBe(false);
  });

  it('says so when neither store can take the rest', () => {
    const r = planResupply({ ...base, baseSpace: { weight: 21, volume: 1e6 } });
    expect(r.toBase).toEqual({ RAT: 100 });
    expect(r.baseFull).toBe(true);
  });

  it('says so when the ship fills up', () => {
    const r = planResupply({ ...base, onShip: {}, shipSpace: { weight: 10, volume: 1e6 } });
    expect(r.shipFull).toBe(true);
  });
});

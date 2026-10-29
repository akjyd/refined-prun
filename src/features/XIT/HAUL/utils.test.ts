import { describe, expect, it } from 'vitest';
import { getCargo, isCarrier, isTransportContract } from './utils';

function condition(
  type: PrunApi.ContractConditionType,
  party: PrunApi.ContractParty,
  extra: Partial<PrunApi.ContractCondition> = {},
) {
  return { type, party, status: 'PENDING', ...extra } as PrunApi.ContractCondition;
}

// The provider (carrier) picks up and delivers; the customer provides the goods and pays.
function shipment(party: PrunApi.ContractParty) {
  return {
    party,
    conditions: [
      condition('PROVISION_SHIPMENT', 'CUSTOMER', { weight: 10, volume: 4 }),
      condition('PICKUP_SHIPMENT', 'PROVIDER', { weight: 10, volume: 4 }),
      condition('DELIVERY_SHIPMENT', 'PROVIDER', { weight: 10, volume: 4 }),
      condition('PAYMENT', 'CUSTOMER', { amount: { amount: 5000, currency: 'AIC' } }),
    ],
  } as PrunApi.Contract;
}

describe('HAUL utils', () => {
  it('detects transport contracts', () => {
    expect(isTransportContract(shipment('PROVIDER'))).toBe(true);
    const other = { party: 'CUSTOMER', conditions: [condition('PAYMENT', 'CUSTOMER')] };
    expect(isTransportContract(other as PrunApi.Contract)).toBe(false);
  });

  it('is the carrier when we pick up the shipment', () => {
    expect(isCarrier(shipment('PROVIDER'))).toBe(true);
    expect(isCarrier(shipment('CUSTOMER'))).toBe(false);
  });

  it('counts the cargo once, not once per condition', () => {
    expect(getCargo(shipment('PROVIDER'))).toEqual({ weight: 10, volume: 4 });
  });
});

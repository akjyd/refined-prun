import { describe, expect, it } from 'vitest';
import { getOutstanding, isBorrowing, isLoanContract } from './utils';

const money = (amount: number) => ({ amount, currency: 'NCC' });

function condition(
  type: PrunApi.ContractConditionType,
  party: PrunApi.ContractParty,
  extra: Partial<PrunApi.ContractCondition> = {},
) {
  return { type, party, status: 'PENDING', ...extra } as PrunApi.ContractCondition;
}

function loan(party: PrunApi.ContractParty, payoutParty: PrunApi.ContractParty) {
  return {
    party,
    conditions: [
      condition('LOAN_PAYOUT', payoutParty, { amount: money(1000), status: 'FULFILLED' }),
      condition('LOAN_INSTALLMENT', party === payoutParty ? 'CUSTOMER' : party, {
        status: 'FULFILLED',
        repayment: money(500),
        interest: money(20),
      }),
      condition('LOAN_INSTALLMENT', party === payoutParty ? 'CUSTOMER' : party, {
        repayment: money(500),
        interest: money(10),
      }),
    ],
  } as PrunApi.Contract;
}

describe('LOAN utils', () => {
  it('detects loan contracts', () => {
    expect(isLoanContract(loan('CUSTOMER', 'PROVIDER'))).toBe(true);
    const other = { party: 'CUSTOMER', conditions: [condition('PAYMENT', 'CUSTOMER')] };
    expect(isLoanContract(other as PrunApi.Contract)).toBe(false);
  });

  it('borrows when the partner pays out', () => {
    expect(isBorrowing(loan('CUSTOMER', 'PROVIDER'))).toBe(true);
    expect(isBorrowing(loan('PROVIDER', 'PROVIDER'))).toBe(false);
  });

  it('counts only unpaid principal and interest', () => {
    expect(getOutstanding(loan('CUSTOMER', 'PROVIDER'))).toEqual({
      principal: 500,
      interest: 10,
      currency: 'NCC',
    });
  });
});

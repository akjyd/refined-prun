export function isLoanContract(contract: PrunApi.Contract) {
  return contract.conditions.some(x => x.type === 'LOAN_PAYOUT' || x.type === 'LOAN_INSTALLMENT');
}

// The payout is made by the lender, so if the partner pays out, we are borrowing.
export function isBorrowing(contract: PrunApi.Contract) {
  const payout = contract.conditions.find(x => x.type === 'LOAN_PAYOUT');
  return payout !== undefined && payout.party !== contract.party;
}

export function getPayout(contract: PrunApi.Contract) {
  return contract.conditions.find(x => x.type === 'LOAN_PAYOUT')?.amount;
}

export function getInstallments(contract: PrunApi.Contract) {
  return contract.conditions.filter(x => x.type === 'LOAN_INSTALLMENT');
}

export function getNextInstallment(contract: PrunApi.Contract) {
  return getInstallments(contract).find(x => x.status !== 'FULFILLED');
}

// Remaining principal and interest: what is still to be repaid.
export function getOutstanding(contract: PrunApi.Contract) {
  let repaid = 0;
  let interest = 0;
  let currency = getPayout(contract)?.currency;
  for (const installment of getInstallments(contract)) {
    if (installment.status === 'FULFILLED') {
      repaid += installment.repayment?.amount ?? 0;
    } else {
      interest += installment.interest?.amount ?? 0;
    }
    currency ??= installment.repayment?.currency;
  }
  const principal = (getPayout(contract)?.amount ?? 0) - repaid;
  return { principal, interest, currency };
}

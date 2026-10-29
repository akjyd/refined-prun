import { getFullAddressName } from '@src/infrastructure/prun-api/data/addresses';

const shipmentTypes: PrunApi.ContractConditionType[] = [
  'PROVISION_SHIPMENT',
  'PICKUP_SHIPMENT',
  'DELIVERY_SHIPMENT',
];

export function isTransportContract(contract: PrunApi.Contract) {
  return contract.conditions.some(x => shipmentTypes.includes(x.type));
}

// The party that picks up (or delivers) the shipment is the carrier.
export function isCarrier(contract: PrunApi.Contract) {
  const pickup = contract.conditions.find(x => x.type === 'PICKUP_SHIPMENT');
  if (pickup) {
    return pickup.party === contract.party;
  }
  const delivery = contract.conditions.find(x => x.type === 'DELIVERY_SHIPMENT');
  return delivery?.party === contract.party;
}

// One shipment appears in several conditions; count it from the first type that has it.
export function getCargo(contract: PrunApi.Contract) {
  for (const type of shipmentTypes) {
    const conditions = contract.conditions.filter(
      x => x.type === type && x.weight !== undefined && x.volume !== undefined,
    );
    if (conditions.length > 0) {
      return {
        weight: sumBy(conditions, x => x.weight!),
        volume: sumBy(conditions, x => x.volume!),
      };
    }
  }
  return undefined;
}

export function getOrigin(contract: PrunApi.Contract) {
  const pickup = contract.conditions.find(x => x.type === 'PICKUP_SHIPMENT');
  const provision = contract.conditions.find(x => x.type === 'PROVISION_SHIPMENT');
  return getFullAddressName(pickup?.address ?? provision?.address);
}

export function getDestination(contract: PrunApi.Contract) {
  const delivery = contract.conditions.find(x => x.type === 'DELIVERY_SHIPMENT');
  return getFullAddressName(delivery?.destination ?? delivery?.address);
}

export function getPayment(contract: PrunApi.Contract) {
  return contract.conditions.find(x => x.type === 'PAYMENT')?.amount;
}

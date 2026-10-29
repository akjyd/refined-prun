import { storagesStore } from '@src/infrastructure/prun-api/data/storage';
import {} from '@src/i18n';

export const allExchangesValue = 'All Exchanges';
export const allLocationsValue = 'All Locations';

export function getRefuelOrigins() {
  return storagesStore.nonFuelStores.value ?? [];
}

import { exchangesStore } from '@src/infrastructure/prun-api/data/exchanges';
import { warehousesStore } from '@src/infrastructure/prun-api/data/warehouses';
import { storagesStore } from '@src/infrastructure/prun-api/data/storage';
import { serializeStorage } from '@src/features/XIT/ACT/actions/utils';

// The exchange chosen once in an ACT configure window, shared by its parts: the resupply
// warehouse exchange, the CX Buy exchange and the MTRA origin (player, 2026-11-06: "why do I
// fill the same thing in three times").
export const sharedExchange = ref<string>();

// Keeps a part's exchange and the shared one the same, both ways.
export function linkExchange(
  get: () => string | undefined,
  set: (value: string) => void,
  allowed: string[],
) {
  watch(
    sharedExchange,
    value => {
      if (value !== undefined && allowed.includes(value) && get() !== value) {
        set(value);
      }
    },
    { immediate: true },
  );
  watch(get, value => {
    if (value !== undefined && allowed.includes(value)) {
      sharedExchange.value = value;
    }
  });
}

// The serialized name of your warehouse at an exchange, as the MTRA origin list writes it.
export function cxWarehouseName(code: string) {
  const warehouse = warehousesStore.getByEntityNaturalId(exchangesStore.getNaturalIdFromCode(code));
  const store = storagesStore.getById(warehouse?.storeId);
  return store ? serializeStorage(store) : undefined;
}

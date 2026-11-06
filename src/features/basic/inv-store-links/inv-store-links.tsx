import $style from './inv-store-links.module.css';
import { getBaseStore, getInvStore } from '@src/core/store-id';
import { shipsStore } from '@src/infrastructure/prun-api/data/ships';
import { sitesStore } from '@src/infrastructure/prun-api/data/sites';
import { storagesStore } from '@src/infrastructure/prun-api/data/storage';
import { warehousesStore } from '@src/infrastructure/prun-api/data/warehouses';
import { getEntityNaturalIdFromAddress } from '@src/infrastructure/prun-api/data/addresses';
import { getLocationLineFromAddress } from '@src/infrastructure/prun-api/data/addresses';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import PrunButton from '@src/components/PrunButton.vue';
import { t } from '@src/i18n';

// A store and the other store at the same place are one click apart (player, 2026-11-06).
// The context buttons in the window header do the same, but the player wants a button they can
// see in the window itself. The buttons go at the end of the sort row, which has free space:
// in the capacity row they squeezed the game's own unload button out of shape (player,
// 2026-11-06).

// Where the window's store is: the planet or station natural id.
function placeOf(tile: PrunTile) {
  if (tile.command === 'SHPI') {
    const ship = shipsStore.getByRegistration(tile.parameter);
    if (!ship || ship.flightId !== null) {
      return undefined;
    }
    return getLocationLineFromAddress(ship.address)?.entity.naturalId;
  }
  const store = getInvStore(tile.parameter);
  if (store?.type === 'WAREHOUSE_STORE') {
    const warehouse = warehousesStore.getById(store.addressableId);
    return getEntityNaturalIdFromAddress(warehouse?.address);
  }
  if (store?.type === 'STORE') {
    const site = sitesStore.getById(store.addressableId);
    return getEntityNaturalIdFromAddress(site?.address);
  }
  return undefined;
}

interface Link {
  label: string;
  command: string;
}

function linksOf(tile: PrunTile): Link[] {
  const place = placeOf(tile);
  if (place === undefined) {
    return [];
  }
  const own = getInvStore(tile.parameter);
  const links: Link[] = [];
  const base = getBaseStore(place);
  if (base && base.id !== own?.id) {
    links.push({ label: t('inv.baseStore'), command: `INV ${base.id.substring(0, 8)}` });
  }
  const warehouse = storagesStore.getById(warehousesStore.getByEntityNaturalId(place)?.storeId);
  if (warehouse && warehouse.id !== own?.id) {
    links.push({ label: t('inv.warehouse'), command: `INV ${warehouse.id.substring(0, 8)}` });
  }
  return links;
}

function onTileReady(tile: PrunTile) {
  subscribe($$(tile.anchor, C.StoreView.column), column => {
    const links = computed(() => linksOf(tile));
    createFragmentApp(() => (
      <span class={$style.links}>
        {links.value.map(link => (
          <PrunButton
            key={link.command}
            neutral
            inline
            onClick={() => void showBuffer(link.command)}>
            {link.label}
          </PrunButton>
        ))}
      </span>
    )).prependTo(column);
  });
}

function init() {
  tiles.observe(['INV', 'SHPI'], onTileReady);
}

features.add(
  import.meta.url,
  init,
  'INV/SHPI: Adds buttons to the other stores at the same place (base store, warehouse).',
);

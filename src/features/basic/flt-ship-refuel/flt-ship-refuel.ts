import { refPrunId } from '@src/infrastructure/prun-ui/attributes';
import ShipRefuelButton from './ShipRefuelButton.vue';

function onTileReady(tile: PrunTile) {
  subscribe($$(tile.anchor, 'tr'), row => {
    // The last cell holds the row command buttons.
    const cell = row.lastElementChild;
    if (!(cell instanceof HTMLElement)) {
      return;
    }
    createFragmentApp(
      ShipRefuelButton,
      reactive({
        id: refPrunId(row),
      }),
    ).appendTo(cell);
  });
}

function init() {
  tiles.observe(['FLT', 'FLTS', 'FLTP'], onTileReady);
}

features.add(
  import.meta.url,
  init,
  'FLT: Adds a button that refuels one ship from the storage at its location without showing windows.',
);

import { refPrunId } from '@src/infrastructure/prun-ui/attributes';
import ShipRefuelButton from './ShipRefuelButton.vue';

function onTileReady(tile: PrunTile) {
  subscribe($$(tile.anchor, 'tr'), async row => {
    // The last cell holds the row command buttons. Put the button after the last one,
    // in the same container, so it stays on the same line.
    const cell = row.lastElementChild;
    if (!(cell instanceof HTMLElement)) {
      return;
    }
    const first = await $(cell, 'button');
    const last = _$$(first.parentElement!, 'button').at(-1) ?? first;
    createFragmentApp(
      ShipRefuelButton,
      reactive({
        id: refPrunId(row),
      }),
    ).after(last);
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

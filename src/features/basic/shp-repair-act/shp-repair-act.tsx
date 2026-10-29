import PrunButton from '@src/components/PrunButton.vue';
import { showTileOverlay } from '@src/infrastructure/prun-ui/tile-overlay';
import { t } from '@src/i18n';
import ShipRepairActDialog from './ShipRepairActDialog.vue';

function onTileReady(tile: PrunTile) {
  subscribe($$(tile.anchor, C.Button.btn), button => {
    if (button.textContent !== L.Ship.action.repair()) {
      return;
    }
    createFragmentApp(() => (
      <PrunButton
        dark
        onClick={(ev: Event) =>
          showTileOverlay(ev, ShipRepairActDialog, { registration: tile.parameter })
        }>
        {t('shipRepair.button')}
      </PrunButton>
    )).after(button);
  });
}

function init() {
  tiles.observe('SHP', onTileReady);
}

features.add(
  import.meta.url,
  init,
  'SHP: Adds a button next to "Repair" that creates an action package to buy and load the repair materials.',
);

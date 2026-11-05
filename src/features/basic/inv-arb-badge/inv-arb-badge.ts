import ArbBadge from './ArbBadge.vue';
import { refTextContent } from '@src/utils/reactive-dom';

// Marks inventory items that hold units of an arbitrage batch started from XIT ARB.
function onTileReady(tile: PrunTile) {
  subscribe($$(tile.anchor, C.StoreView.container), container => {
    subscribe($$(container, C.GridItemView.image), async item => {
      const label = await $(item, C.ColoredIcon.label);
      const ticker = refTextContent(label);
      // On the item's parent, so the bottom-left item markers (which check the item's own
      // children) still work.
      const host = item.parentElement;
      if (!host) {
        return;
      }
      host.style.position = 'relative';
      createFragmentApp(ArbBadge, reactive({ ticker: computed(() => ticker.value) })).appendTo(
        host,
      );
    });
  });
}

function init() {
  tiles.observe(['INV', 'SHPI'], onTileReady);
}

features.add(
  import.meta.url,
  init,
  'INV/SHPI: Marks items with units of an open arbitrage batch from XIT ARB.',
);

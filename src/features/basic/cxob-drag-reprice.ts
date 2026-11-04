import $style from './cxob-drag-reprice.module.css';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { companyStore } from '@src/infrastructure/prun-api/data/company';
import { refPrunId } from '@src/infrastructure/prun-ui/attributes';
import { watchEffectWhileNodeAlive } from '@src/utils/watch';
import { useOrderDrag } from '@src/hooks/use-order-drag';
import { BookOrder } from '@src/core/price-step';
import { fixed02 } from '@src/utils/format';

// Drag one of your orders to another place in the order book to place it again there,
// the same way as in XIT CX4 and XIT ORDERS.
function onTileReady(tile: PrunTile) {
  const drag = useOrderDrag();
  const book = computed((): BookOrder[] => {
    const b = cxobStore.getByTicker(tile.parameter);
    if (!b) {
      return [];
    }
    const asks = b.sellingOrders.map(x => ({ id: x.id, ask: true, price: x.limit.amount }));
    const bids = b.buyingOrders.map(x => ({ id: x.id, ask: false, price: x.limit.amount }));
    return [...asks.sort((x, y) => y.price - x.price), ...bids.sort((x, y) => y.price - x.price)];
  });
  const own = computed(() => {
    const b = cxobStore.getByTicker(tile.parameter);
    const ownId = companyStore.value?.id;
    return new Set(
      [...(b?.sellingOrders ?? []), ...(b?.buyingOrders ?? [])]
        .filter(x => x.trader.id === ownId)
        .map(x => x.id),
    );
  });

  subscribe($$(tile.anchor, 'tr'), tr => {
    const id = refPrunId(tr);
    const cell = tr.children[0] as HTMLElement | undefined;
    if (!cell) {
      return;
    }
    const order = () => book.value.find(x => x.id === id.value);
    tr.addEventListener('dragstart', e => {
      const o = order();
      if (o && own.value.has(o.id)) {
        drag.start(e, o);
      }
    });
    tr.addEventListener('dragover', e => {
      const o = order();
      if (o) {
        drag.over(e, book.value, book.value.indexOf(o));
      }
    });
    tr.addEventListener('dragend', () => drag.end());
    tr.addEventListener('drop', e => void drag.drop(e));
    watchEffectWhileNodeAlive(tr, () => {
      const orderId = id.value ?? '';
      tr.draggable = own.value.has(orderId);
      tr.classList.toggle($style.own, own.value.has(orderId));
      tr.classList.toggle($style.dropAbove, drag.lineAbove(orderId));
      tr.classList.toggle($style.dropBelow, drag.lineBelow(orderId));
      const price = drag.newPrice.value;
      cell.dataset.dropPrice = price !== undefined ? fixed02(price) : '';
    });
  });
}

function init() {
  tiles.observe('CXOB', onTileReady);
}

features.add(
  import.meta.url,
  init,
  'CXOB: Drag one of your orders to another place in the book to place it again there.',
);

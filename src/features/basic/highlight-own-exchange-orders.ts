import $style from './highlight-own-exchange-orders.module.css';
import { companyStore } from '@src/infrastructure/prun-api/data/company';
import { refPrunId } from '@src/infrastructure/prun-ui/attributes';
import { watchEffectWhileNodeAlive } from '@src/utils/watch';
import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { fxobStore } from '@src/infrastructure/prun-api/data/fxob';
import { createReactiveSpan } from '@src/utils/reactive-element';
import { fixed0 } from '@src/utils/format';
import { getOwnCxOrder, orderChange } from '@src/core/order-seen';

type GetOwnOrders = (parameter?: string) => { id: string }[] | undefined;

function onTileReady(tile: PrunTile, getOwnOrders: GetOwnOrders, orderCommand: string) {
  const ownOrders = computed(() => {
    const ownOrders = new Map<string, { id: string }>();
    const orders = getOwnOrders(tile.parameter);
    if (!orders) {
      return ownOrders;
    }
    for (const order of orders) {
      ownOrders.set(order.id, order);
    }
    return ownOrders;
  });
  subscribe($$(tile.anchor, 'tr'), tr => {
    const id = refPrunId(tr);
    const ownOrder = computed(() => ownOrders.value.get(id.value ?? ''));
    const amountColumn = tr.children[1] as HTMLElement;
    if (amountColumn === undefined) {
      return;
    }
    amountColumn.addEventListener('click', e => {
      if (ownOrder.value) {
        void showBuffer(`${orderCommand} ${ownOrder.value.id.substring(0, 8)}`);
        e.preventDefault();
        e.stopPropagation();
      }
    });
    if (orderCommand === 'CXO') {
      // Your own CX orders show the amount left / the amount placed.
      const placed = computed(() => {
        const order = ownOrder.value ? getOwnCxOrder(ownOrder.value.id) : undefined;
        return order ? `/${fixed0(order.initialAmount)}` : undefined;
      });
      amountColumn.appendChild(createReactiveSpan(tr, placed));
      // What changed since you last left XIT ORDERS.
      const change = computed(() => {
        const order = ownOrder.value ? getOwnCxOrder(ownOrder.value.id) : undefined;
        return order ? orderChange(order.id, order.amount) : undefined;
      });
      const changeSpan = createReactiveSpan(tr, change);
      changeSpan.classList.add($style.change);
      amountColumn.prepend(changeSpan);
      watchEffectWhileNodeAlive(tr, () =>
        tr.classList.toggle($style.changed, change.value !== undefined),
      );
    }
    watchEffectWhileNodeAlive(tr, () => {
      const isOwnOrder = ownOrder.value !== undefined;
      tr.classList.toggle($style.ownOrder, isOwnOrder);
      // Clickable, in the text color, not the blue link color (player, 2026-11-06).
      amountColumn.classList.toggle($style.clickable, isOwnOrder);
    });
  });
}

function getOwnComexOrders(parameter?: string) {
  const orderBook = cxobStore.getByTicker(parameter);
  if (!orderBook) {
    return undefined;
  }
  return [...orderBook.sellingOrders, ...orderBook.buyingOrders].filter(
    x => x.trader.id === companyStore.value?.id,
  );
}

function getOwnForexOrders(parameter?: string) {
  const orderBook = fxobStore.getByTicker(parameter);
  if (!orderBook) {
    return undefined;
  }
  return [...orderBook.sellingOrders, ...orderBook.buyingOrders].filter(
    x => x.trader.id === companyStore.value?.id,
  );
}

function init() {
  tiles.observe('CXOB', x => onTileReady(x, getOwnComexOrders, 'CXO'));
  tiles.observe('FXOB', x => onTileReady(x, getOwnForexOrders, 'FXO'));
}

features.add(import.meta.url, init, 'Highlights own orders in CXOB and FXOB.');

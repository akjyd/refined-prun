import { BookOrder, dropTargetPrice } from '@src/core/price-step';
import { getOwnCxOrder } from '@src/core/order-seen';
import { repriceOrder } from '@src/infrastructure/prun-ui/utils/reprice-order';
import { showErrorOverlay } from '@src/infrastructure/prun-ui/tile-overlay';
import { t } from '@src/i18n';

// Drag one of your orders to another place in an order book to place it again there.
// The same in CXOB, XIT CX4 and XIT ORDERS.
export function useOrderDrag() {
  const dragged = ref<BookOrder>();
  // The book of the order (highest price first) and the index the drop line is above.
  const target = shallowRef<{ book: BookOrder[]; at: number }>();
  const busy = ref(false);

  const newPrice = computed(() =>
    dragged.value && target.value
      ? dropTargetPrice(target.value.book, dragged.value, target.value.at)
      : undefined,
  );

  function start(e: DragEvent, order: BookOrder) {
    if (busy.value) {
      e.preventDefault();
      return;
    }
    dragged.value = order;
    e.dataTransfer?.setData('text/plain', order.id);
  }

  // Index of the hovered order in its book; the lower half of a row means "below it".
  function over(e: DragEvent, book: BookOrder[], index: number) {
    if (!dragged.value || !book.some(x => x.id === dragged.value!.id)) {
      return;
    }
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    const below = e.offsetY > el.clientHeight / 2;
    target.value = { book, at: below ? index + 1 : index };
  }

  function end() {
    dragged.value = undefined;
    target.value = undefined;
  }

  async function drop(e: DragEvent) {
    e.preventDefault();
    const order = dragged.value ? getOwnCxOrder(dragged.value.id) : undefined;
    const price = newPrice.value;
    end();
    if (!order) {
      return;
    }
    const element = e.target as Element;
    if (price === undefined) {
      showErrorOverlay(element, t('orders.badDrop'));
      return;
    }
    busy.value = true;
    try {
      await repriceOrder(element, order, price);
    } finally {
      busy.value = false;
    }
  }

  // Between the last ask and the first bid, the line of a sell order sits under the last ask, on
  // the ask side of the spread divider; the line of a buy order sits over the first bid.
  function onAskEdge() {
    const tgt = target.value;
    if (tgt === undefined || dragged.value?.ask !== true) {
      return false;
    }
    const above = tgt.book[tgt.at - 1];
    const below = tgt.book[tgt.at];
    return above !== undefined && below !== undefined && above.ask && !below.ask;
  }

  // True when the drop line is above this order (or below it, for the last one).
  function lineAbove(id: string) {
    const tgt = target.value;
    return tgt !== undefined && !onAskEdge() && tgt.book[tgt.at]?.id === id;
  }

  function lineBelow(id: string) {
    const tgt = target.value;
    if (tgt === undefined) {
      return false;
    }
    if (onAskEdge()) {
      return tgt.book[tgt.at - 1]?.id === id;
    }
    return tgt.at === tgt.book.length && tgt.book.at(-1)?.id === id;
  }

  return { dragged, newPrice, start, over, end, drop, lineAbove, lineBelow };
}

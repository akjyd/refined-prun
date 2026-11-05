import { deleteExchangeOrder } from '@src/infrastructure/prun-ui/utils/delete-exchange-order';
import { placeCxOrder } from '@src/infrastructure/prun-ui/utils/place-cx-order';
import { showErrorOverlay } from '@src/infrastructure/prun-ui/tile-overlay';
import { fixed0, fixed02 } from '@src/utils/format';
import { t } from '@src/i18n';

// Deletes the order (the game asks to confirm), then places the rest of it at the new price.
export async function repriceOrder(target: Element, order: PrunApi.CXOrder, price: number) {
  const cxTicker = `${order.material.ticker}.${order.exchange.code}`;
  const amount = order.amount;
  const ask = order.type === 'SELLING';
  const deleted = await deleteExchangeOrder(target, order.id, 'CXOS', true);
  if (!deleted) {
    return false;
  }
  const error = await placeCxOrder(cxTicker, ask, amount, price);
  if (error !== undefined) {
    showErrorOverlay(
      target,
      t('orders.replaceFailed', fixed0(amount), cxTicker, fixed02(order.limit.amount), error),
    );
    return false;
  }
  return true;
}

import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { deleteExchangeOrder } from '@src/infrastructure/prun-ui/utils/delete-exchange-order';
import { waitActionFeedback } from '@src/infrastructure/prun-ui/utils/action-feedback';
import { showErrorOverlay } from '@src/infrastructure/prun-ui/tile-overlay';
import { changeInputValue, clickElement } from '@src/util';
import { fixed0, fixed02 } from '@src/utils/format';
import { sleep } from '@src/utils/sleep';
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
  const done = ref(false);
  try {
    const window = await showBuffer(`CXPO ${cxTicker}`, {
      force: true,
      autoClose: true,
      closeWhen: done,
    });
    const form = window !== undefined ? await $(window, C.ComExPlaceOrderForm.form) : undefined;
    const inputs = form ? _$$(form, 'input') : [];
    const button = form ? _$(form, ask ? C.Button.danger : C.Button.success) : undefined;
    if (window === undefined || inputs.length < 2 || !button) {
      throw new Error('CXPO form not found');
    }
    changeInputValue(inputs[0], amount.toString());
    changeInputValue(inputs[1], fixed02(price));
    await sleep(0);
    await clickElement(button);
    const { result, message } = await waitActionFeedback(window, {
      autoConfirm: true,
      dismissSuccess: true,
      timeoutMs: 15000,
    });
    if (result !== 'success') {
      throw new Error(message);
    }
    return true;
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    showErrorOverlay(
      target,
      t('orders.replaceFailed', fixed0(amount), cxTicker, fixed02(order.limit.amount), reason),
    );
    return false;
  } finally {
    done.value = true;
  }
}

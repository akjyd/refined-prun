import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { waitActionFeedback } from '@src/infrastructure/prun-ui/utils/action-feedback';
import { changeInputValue, clickElement } from '@src/util';
import { fixed02 } from '@src/utils/format';
import { sleep } from '@src/utils/sleep';

// Places an order in a hidden CXPO window: amount at the limit price, buy or sell. Returns the
// error message, or undefined when the game confirms the order.
export async function placeCxOrder(cxTicker: string, sell: boolean, amount: number, price: number) {
  const done = ref(false);
  try {
    const window = await showBuffer(`CXPO ${cxTicker}`, {
      force: true,
      autoClose: true,
      closeWhen: done,
    });
    const form = window !== undefined ? await $(window, C.ComExPlaceOrderForm.form) : undefined;
    const inputs = form ? _$$(form, 'input') : [];
    const button = form ? _$(form, sell ? C.Button.danger : C.Button.success) : undefined;
    if (window === undefined || inputs.length < 2 || !button) {
      return 'CXPO form not found';
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
    return result === 'success' ? undefined : message !== '' ? message : result;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  } finally {
    done.value = true;
  }
}

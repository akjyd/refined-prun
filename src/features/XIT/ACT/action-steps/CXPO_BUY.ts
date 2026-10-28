import { act } from '@src/features/XIT/ACT/act-registry';
import { fixed0, fixed02 } from '@src/utils/format';
import { changeInputValue, clickElement } from '@src/util';
import { fillAmount } from '@src/features/XIT/ACT/actions/cx-buy/utils';
import { storagesStore } from '@src/infrastructure/prun-api/data/storage';
import { exchangesStore } from '@src/infrastructure/prun-api/data/exchanges';
import { warehousesStore } from '@src/infrastructure/prun-api/data/warehouses';
import { watchWhile } from '@src/utils/watch';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { watchEffect } from 'vue';
import { AssertFn } from '@src/features/XIT/ACT/shared-types';
import { t } from '@src/i18n';

interface Data {
  exchange: string;
  ticker: string;
  amount: number;
  priceLimit: number;
  allowUnfilled: boolean;
}

export const CXPO_BUY = act.addActionStep<Data>({
  type: 'CXPO_BUY',
  preProcessData: data => ({ ...data, ticker: data.ticker.toUpperCase() }),
  description: data => {
    const { ticker, exchange } = data;
    const cxTicker = `${ticker}.${exchange}`;
    const filled = fillAmount(cxTicker, data.amount, data.priceLimit);
    const amount = filled?.amount ?? data.amount;
    const priceLimit = filled?.priceLimit ?? data.priceLimit;
    const allowUnfilled = data.allowUnfilled ?? false;
    const willFillCompletely = filled && filled.amount === data.amount;

    if (!willFillCompletely && allowUnfilled) {
      let description = t('act.cxpo.bid', fixed0(data.amount), ticker, exchange);
      if (isFinite(priceLimit)) {
        description += t('act.cxpo.atPrice', fixed02(data.priceLimit));
        description += t('act.cxpo.totalCost', fixed0(data.amount * data.priceLimit));
      }
      return description;
    }

    let description = t('act.cxpo.buy', fixed0(amount), ticker, exchange);
    if (isFinite(priceLimit)) {
      description += t('act.cxpo.withLimit', fixed02(priceLimit));
    }
    if (filled) {
      description += t('act.cxpo.totalCost', fixed0(filled.cost));
    } else {
      description += t('act.cxpo.noPrice');
    }
    return description;
  },
  execute: async ctx => {
    const { data, log, setStatus, requestTile, waitAct, waitActionFeedback, complete, skip, fail } =
      ctx;
    const assert: AssertFn = ctx.assert;
    const { amount, ticker, exchange, priceLimit } = data;
    const cxTicker = `${ticker}.${exchange}`;
    const cxWarehouse = computed(() => {
      const naturalId = exchangesStore.getNaturalIdFromCode(exchange);
      const warehouse = warehousesStore.getByEntityNaturalId(naturalId);
      return storagesStore.getById(warehouse?.storeId);
    });
    assert(cxWarehouse.value, t('act.cxpo.noWarehouse', exchange));

    if (amount <= 0) {
      log.warning(t('act.cxpo.zero', ticker));
      skip();
      return;
    }

    const material = materialsStore.getByTicker(ticker);
    assert(material, t('act.step.unknownMaterial', ticker));

    const canFitWeight =
      material.weight * amount <= cxWarehouse.value.weightCapacity - cxWarehouse.value.weightLoad;
    const canFitVolume =
      material.volume * amount <= cxWarehouse.value.volumeCapacity - cxWarehouse.value.volumeLoad;
    assert(canFitWeight && canFitVolume, t('act.cxpo.noFit', fixed0(amount), ticker));

    const tile = await requestTile(`CXPO ${cxTicker}`);
    if (!tile) {
      return;
    }

    setStatus(t('act.cxpo.setup'));

    const buyButton = await $(tile.anchor, C.Button.success);
    const form = await $(tile.anchor, C.ComExPlaceOrderForm.form);
    const inputs = _$$(form, 'input');
    const quantityInput = inputs[0];
    assert(quantityInput !== undefined, t('act.cxpo.noQuantity'));
    const priceInput = inputs[1];
    assert(priceInput !== undefined, t('act.cxpo.noPriceInput'));

    let shouldUnwatch = false;
    let lastShortageWarning: string | undefined;
    const unwatch = watchEffect(() => {
      if (shouldUnwatch) {
        unwatch();
        return;
      }

      const filled = fillAmount(cxTicker, amount, priceLimit);

      if (!filled) {
        shouldUnwatch = true;
        fail(t('act.cxpo.noBook', cxTicker));
        return;
      }

      if (filled.amount < amount && !data.allowUnfilled) {
        const leftover = amount - filled.amount;
        let message = t(
          'act.cxpo.shortage',
          fixed0(leftover),
          ticker,
          exchange,
          fixed0(filled.amount),
          fixed0(amount),
        );
        if (isFinite(priceLimit)) {
          message += t('act.cxpo.shortageLimit', fixed02(priceLimit));
        }
        message += t('act.common.closeParen');
        // Order-book updates rerun this effect; log only changed shortages.
        if (message !== lastShortageWarning) {
          lastShortageWarning = message;
          log.warning(message);
        }
        if (filled.amount === 0) {
          shouldUnwatch = true;
          skip();
          return;
        }
      }

      if (data.allowUnfilled) {
        changeInputValue(quantityInput, data.amount.toString());
        changeInputValue(priceInput, fixed02(data.priceLimit));
      } else {
        changeInputValue(quantityInput, filled.amount.toString());
        changeInputValue(priceInput, fixed02(filled.priceLimit));
      }

      // Cache the description before buying changes the order book.
      ctx.cacheDescription();
    });

    if (shouldUnwatch) {
      return;
    }

    function onManualInput(event: Event) {
      // Synthetic events from changeInputValue() have isTrusted === false.
      if (event.isTrusted && !shouldUnwatch) {
        shouldUnwatch = true;
        log.info(t('act.cxpo.manual'));
      }
    }
    quantityInput.addEventListener('input', onManualInput);
    priceInput.addEventListener('input', onManualInput);

    await waitAct();
    quantityInput.removeEventListener('input', onManualInput);
    priceInput.removeEventListener('input', onManualInput);
    unwatch();

    const warehouseAmount = computed(() => {
      return (
        cxWarehouse.value?.items
          .map(x => x.quantity ?? undefined)
          .filter(x => x !== undefined)
          .find(x => x.material.ticker === ticker)?.amount ?? 0
      );
    });
    const currentAmount = warehouseAmount.value;
    const amountToFill = fillAmount(cxTicker, amount, priceLimit)?.amount ?? 0;
    const shouldWaitForUpdate = amountToFill > 0;

    await clickElement(buyButton);
    await waitActionFeedback(tile);

    if (shouldWaitForUpdate) {
      setStatus(t('act.step.waitStorage'));
      await watchWhile(() => warehouseAmount.value === currentAmount);
    } else {
      setStatus(t('act.cxpo.bidCreated'));
    }

    complete();
  },
});

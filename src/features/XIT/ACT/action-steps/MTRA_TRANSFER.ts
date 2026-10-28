import { act } from '@src/features/XIT/ACT/act-registry';
import { serializeStorage } from '@src/features/XIT/ACT/actions/utils';
import { fixed0 } from '@src/utils/format';
import { changeInputValue, clickElement, selectMaterialInMaterialSelector } from '@src/util';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { watchWhile } from '@src/utils/watch';
import { storagesStore } from '@src/infrastructure/prun-api/data/storage';
import { AssertFn } from '@src/features/XIT/ACT/shared-types';
import { t } from '@src/i18n';

interface Data {
  from: string;
  to: string;
  ticker: string;
  amount: number;
  // Use the live MTRA slider maximum instead of data.amount to load all available goods.
  loadAll?: boolean;
  // Prefill data.amount and delay ACT for 2s so the player can adjust it in MTRA.
  playerReview?: boolean;
}

export const MTRA_TRANSFER = act.addActionStep<Data>({
  type: 'MTRA_TRANSFER',
  preProcessData: data => ({ ...data, ticker: data.ticker.toUpperCase() }),
  totalMaterials: data => ({ [data.ticker]: data.amount }),
  description: data => {
    const from = storagesStore.getById(data.from);
    const to = storagesStore.getById(data.to);
    const fromName = from ? serializeStorage(from) : t('act.mtra.notFound');
    const toName = to ? serializeStorage(to) : t('act.mtra.notFound');
    if (data.loadAll) {
      return t('act.mtra.all', data.ticker, fromName, toName);
    }
    if (data.playerReview) {
      return t('act.mtra.upTo', fixed0(data.amount), data.ticker, fromName, toName);
    }
    return t('act.mtra.exact', fixed0(data.amount), data.ticker, fromName, toName);
  },
  execute: async ctx => {
    const { data, log, setStatus, requestTile, waitAct, waitActionFeedback, complete, skip, fail } =
      ctx;
    const assert: AssertFn = ctx.assert;
    const { ticker, amount, loadAll, playerReview } = data;
    const from = storagesStore.getById(data.from);
    assert(from, t('act.mtra.noOrigin'));
    const to = storagesStore.getById(data.to);
    assert(to, t('act.mtra.noDest'));

    if (!from.items.find(x => x.quantity?.material.ticker === ticker)) {
      log.warning(t('act.mtra.notPresent', ticker));
      skip();
      return;
    }

    // Data.amount is only a snapshot estimate for loadAll totals/description.
    if (!loadAll && amount <= 0) {
      log.warning(t('act.mtra.zero', ticker));
      skip();
      return;
    }

    const material = materialsStore.getByTicker(ticker);
    assert(material, t('act.step.unknownMaterial', ticker));

    // Check if we can fit a single unit. MTRA will be unusable otherwise.
    const epsilon = 0.000001;
    const canFitWeight = to.weightCapacity - to.weightLoad - material.weight + epsilon >= 0;
    const canFitVolume = to.volumeCapacity - to.volumeLoad - material.volume + epsilon >= 0;
    if (!canFitWeight || !canFitVolume) {
      log.warning(t('act.mtra.noSpace', ticker));
      skip();
      return;
    }

    const tile = await requestTile(
      `MTRA from-${from.id.substring(0, 8)} to-${to.id.substring(0, 8)}`,
    );
    if (!tile) {
      return;
    }

    setStatus(t('act.mtra.setup'));
    const container = await $(tile.anchor, C.MaterialSelector.container);

    const ok = await selectMaterialInMaterialSelector(container, ticker);
    if (!ok) {
      fail(t('act.mtra.noTicker', ticker));
      return;
    }

    const sliderNumbers = _$$(tile.anchor, 'rc-slider-mark-text').map(x =>
      Number(x.textContent ?? 0),
    );
    const maxAmount = Math.max(...sliderNumbers);
    const allInputs = _$$(tile.anchor, 'input');
    const amountInput = allInputs[1];
    assert(amountInput !== undefined, t('act.mtra.noAmount'));

    if (loadAll) {
      if (maxAmount === 0) {
        log.warning(t('act.mtra.nothing', ticker));
        skip();
        return;
      }
      changeInputValue(amountInput, maxAmount.toString());
    } else {
      if (amount > maxAmount) {
        if (maxAmount === 0) {
          log.warning(t('act.mtra.nothing', ticker));
          skip();
          return;
        }
        // The player still has to review the amount; do not log it as transferred yet.
        if (!playerReview) {
          const leftover = amount - maxAmount;
          log.warning(
            t('act.mtra.partial', fixed0(leftover), ticker, fixed0(maxAmount), fixed0(amount)),
          );
        }
      }
      changeInputValue(amountInput, Math.min(amount, maxAmount).toString());
    }

    const transferButton = await $(tile.anchor, C.Button.btn);

    if (playerReview) {
      await waitAct(t('act.mtra.adjust', ticker), { actDelayMs: 2000 });
      // Use whatever amount the player left in the input - do not rewrite it.
      const reviewed = Number(amountInput.value);
      if (!Number.isFinite(reviewed) || reviewed <= 0) {
        log.warning(t('act.mtra.playerZero', ticker));
        skip();
        return;
      }
    } else {
      await waitAct();
    }

    const destinationAmount = computed(() => {
      const store = storagesStore.getById(data.to);
      return (
        store?.items
          .map(x => x.quantity ?? undefined)
          .filter(x => x !== undefined)
          .find(x => x.material.ticker === ticker)?.amount ?? 0
      );
    });
    const currentAmount = destinationAmount.value;
    await clickElement(transferButton);
    await waitActionFeedback(tile);
    setStatus(t('act.step.waitStorage'));
    await watchWhile(() => destinationAmount.value === currentAmount);

    complete();
  },
});

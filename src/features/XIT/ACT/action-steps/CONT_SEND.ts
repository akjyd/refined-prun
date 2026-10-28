import { act } from '@src/features/XIT/ACT/act-registry';
import { ddmm, fixed0, fixed2 } from '@src/utils/format';
import { changeSelectIndex, selectAndChangeInputValue } from '@src/util';
import { materialsStore } from '@src/infrastructure/prun-api/data/materials';
import { selectAddress } from '@src/infrastructure/prun-ui/utils/select-address';
import { AssertFn } from '@src/features/XIT/ACT/shared-types';
import {
  pollUntil,
  createNewDraft,
  setDraftNameAndPreamble,
  saveDraftDetails,
  openTemplate,
  selectTemplateType,
  setCurrency,
  addMaterials,
  setDeadline,
  applyTemplate,
  saveConditions,
} from '@src/features/XIT/ACT/action-steps/cont-utils';
import { billQuantities, MaterialBill } from '@src/features/XIT/ACT/material-bill';
import { t } from '@src/i18n';

interface Data {
  packageName: string;
  materials: MaterialBill;
  contractNote?: string;
  payment: number;
  currency: string;
  daysToFulfill: number;
  contOrigin?: string;
  contDest?: string;
  autoProvisionStoreId?: string;
}

function findPriceInput(anchor: Element) {
  const named = _$$(anchor, 'input').find(x => x.name === 'price');
  if (named) {
    return named;
  }
  const groups = _$$(anchor, C.TemplateSelection.group);
  return _$$(anchor, 'input').find(
    x => x.inputMode === 'decimal' && !groups.some(group => group.contains(x)),
  );
}

export const CONT_SEND = act.addActionStep<Data>({
  type: 'CONT_SEND',
  totalMaterials: data => billQuantities(data.materials, (_, quantity) => quantity > 0),
  description: data => {
    const materialCount = Object.keys(data.materials).length;
    const payment =
      data.payment !== 0 ? t('act.cont.forPayment', fixed0(data.payment), data.currency) : '';
    return t('act.cont.shipDraft', fixed0(materialCount), payment);
  },
  execute: async ctx => {
    const { data, log, setStatus, requestTile, waitAct, complete } = ctx;
    const assert: AssertFn = ctx.assert;

    // Compute total tonnage for the preamble and payment logging.
    let totalTonnage = 0;
    const materialDetails: Array<{ ticker: string; amount: number }> = [];

    for (const [ticker, { quantity: amount }] of Object.entries(data.materials)) {
      if (amount <= 0) {
        continue;
      }
      const material = materialsStore.getByTicker(ticker);
      if (!material) {
        log.warning(t('act.cont.matSkip', ticker));
        continue;
      }
      totalTonnage += material.weight * amount;
      materialDetails.push({ ticker, amount });
    }

    assert(materialDetails.length > 0, t('act.cont.noMaterials'));

    if (data.payment > 0 && totalTonnage > 0) {
      log.info(
        t(
          'act.cont.total',
          fixed2(totalTonnage),
          fixed0(data.payment),
          data.currency,
          fixed0(data.payment / totalTonnage),
        ),
      );
    }

    // Create new draft.
    const listTile = await requestTile('CONTD');
    if (!listTile) {
      return;
    }

    const newDraft = await createNewDraft(ctx, listTile);

    setStatus(t('act.cont.loadingDraft', newDraft.naturalId));
    const draftTile = await requestTile(`CONTD ${newDraft.naturalId}`);
    if (!draftTile) {
      return;
    }
    const anchor = draftTile.anchor;

    const dateStr = ddmm();
    const contractName = `${data.packageName} - ${data.contDest ?? ''} - ${dateStr}`;

    const materialsList = materialDetails.map(x => `${x.ticker} x${fixed0(x.amount)}`).join(', ');
    const preambleText =
      data.contractNote ??
      `Shipping contract for ${fixed2(totalTonnage)}t.\n` +
        `Materials: ${materialsList}\n` +
        (data.payment > 0
          ? `Payment: ${fixed0(data.payment)} ${data.currency} (${fixed0(data.payment / totalTonnage)} ${data.currency}/t)\n`
          : '') +
        (data.daysToFulfill > 0 ? `Delivery within ${fixed0(data.daysToFulfill)} days` : '');

    await setDraftNameAndPreamble(ctx, anchor, contractName, preambleText);

    // Save draft details (name/preamble).
    await waitAct(t('act.cont.saveDetailsAsk'));
    await saveDraftDetails(ctx, draftTile, newDraft.naturalId);

    const templateSelect = await openTemplate(ctx, anchor);
    selectTemplateType(ctx, templateSelect, 'SHIP');
    await setCurrency(ctx, anchor, data.currency);

    await addMaterials(ctx, anchor, materialDetails);

    // The SHIP template price field is per-commodity - the game charges this
    // amount for each commodity row. Divide total payment by number of commodities.
    if (data.payment > 0 && materialDetails.length > 0) {
      const pricePerCommodity = Math.round(data.payment / materialDetails.length);
      const priceInput = findPriceInput(anchor);
      assert(priceInput, t('act.cont.noPrice'));
      selectAndChangeInputValue(priceInput, String(pricePerCommodity));
      log.info(
        t(
          'act.cont.priceSet',
          fixed0(pricePerCommodity),
          data.currency,
          fixed0(materialDetails.length),
          fixed0(pricePerCommodity * materialDetails.length),
        ),
      );
    }

    // Set origin address.
    const addressContainers = _$$(anchor, C.AddressSelector.container);

    assert(addressContainers.length >= 1 && data.contOrigin !== undefined, t('act.cont.noOrigin'));
    await waitAct(t('act.cont.setOriginAsk', data.contOrigin));
    const originSet = await selectAddress(addressContainers[0], data.contOrigin);
    assert(originSet, t('act.cont.originFailed', data.contOrigin));
    log.info(t('act.cont.originSet', data.contOrigin));

    // Set destination address.
    assert(addressContainers.length >= 2 && data.contDest !== undefined, t('act.cont.noDest'));
    await waitAct(t('act.cont.setDestAsk', data.contDest));
    const destSet = await selectAddress(addressContainers[1], data.contDest);
    assert(destSet, t('act.cont.destFailed', data.contDest));
    log.info(t('act.cont.destSet', data.contDest));

    if (data.autoProvisionStoreId !== undefined) {
      setStatus(t('act.cont.settingStore'));
      // The store options only populate once the origin address resolves.
      const storeSelect = await pollUntil(() => {
        const select = _$(anchor, C.StoreSelect.container) as HTMLSelectElement | undefined;
        return select !== undefined && select.options.length > 1 ? select : undefined;
      }, 5000);
      assert(storeSelect, t('act.cont.noStoreSelect'));

      const normalizedId = data.autoProvisionStoreId.replaceAll('-', '');
      const optionIndex = Array.from(storeSelect.options).findIndex(
        x => x.value === data.autoProvisionStoreId || x.value === normalizedId,
      );
      assert(optionIndex >= 0, t('act.cont.noStoreOption', data.autoProvisionStoreId));
      changeSelectIndex(storeSelect, optionIndex);
      log.info(t('act.cont.storeSet', storeSelect.options[optionIndex].text));
    }

    setDeadline(ctx, anchor, data.daysToFulfill);

    // Apply template.
    await waitAct(t('act.cont.applyTemplateAsk'));
    await applyTemplate(ctx, anchor, newDraft.naturalId);

    // Save conditions, after the player has reviewed them.
    await waitAct(t('act.cont.saveCondAsk'));
    await saveConditions(ctx, draftTile, newDraft.naturalId);

    log.success(t('act.cont.ready', newDraft.naturalId));
    complete();
  },
});

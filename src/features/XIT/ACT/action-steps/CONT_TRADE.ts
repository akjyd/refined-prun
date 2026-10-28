import { act } from '@src/features/XIT/ACT/act-registry';
import { ddmm, fixed0, fixed02 } from '@src/utils/format';
import { selectAndChangeInputValue } from '@src/util';
import { selectAddress } from '@src/infrastructure/prun-ui/utils/select-address';
import { AssertFn } from '@src/features/XIT/ACT/shared-types';
import { isValidContractPrice } from '@src/features/XIT/ACT/actions/cont-limits';
import {
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
  tradeType: 'BUYING' | 'SELLING';
  location: string;
  currency: string;
  daysToFulfill: number;
}

export const CONT_TRADE = act.addActionStep<Data>({
  type: 'CONT_TRADE',
  totalMaterials: data => billQuantities(data.materials, (_, quantity) => quantity > 0),
  description: data => {
    const materialCount = Object.keys(data.materials).length;
    const typeLabel = data.tradeType === 'BUYING' ? t('act.cont.buy') : t('act.cont.sell');
    return t('act.cont.tradeDraft', typeLabel, fixed0(materialCount));
  },
  execute: async ctx => {
    const { data, log, setStatus, requestTile, waitAct, complete } = ctx;
    const assert: AssertFn = ctx.assert;

    const typeLabel = data.tradeType === 'BUYING' ? 'Buy' : 'Sell';

    // Step 1: Create new draft.
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
    const contractName = `${data.packageName} - ${typeLabel} - ${dateStr}`;

    const materialsList = Object.entries(data.materials)
      .map(([ticker, { quantity: amount, price }]) => {
        return price !== undefined
          ? `${ticker} x${fixed0(amount)} @ ${fixed02(price)}/u`
          : `${ticker} x${fixed0(amount)}`;
      })
      .join(', ');
    const preambleText =
      `${typeLabel} contract.\n` +
      `Materials: ${materialsList}\n` +
      (data.daysToFulfill > 0 ? `Fulfill within ${fixed0(data.daysToFulfill)} days` : '');

    await setDraftNameAndPreamble(ctx, anchor, contractName, preambleText);

    // Save draft details (name/preamble).
    await waitAct(t('act.cont.saveDetailsAsk'));
    await saveDraftDetails(ctx, draftTile, newDraft.naturalId);

    const templateSelect = await openTemplate(ctx, anchor);
    selectTemplateType(ctx, templateSelect, data.tradeType);
    await setCurrency(ctx, anchor, data.currency);

    // Add materials with per-material prices.
    const materialEntries = Object.entries(data.materials)
      .filter(([, x]) => x.quantity > 0)
      .map(([ticker, { quantity: amount }]) => ({ ticker, amount }));

    await addMaterials(ctx, anchor, materialEntries, {
      setPrice: (group, ticker) => {
        // Fail on a missing price to prevent a free trade.
        const price = data.materials[ticker].price;
        assert(isValidContractPrice(price), t('act.cont.invalidPrice', ticker));
        const priceInput = _$$(group, 'input').find(x => x.inputMode === 'decimal');
        assert(priceInput, t('act.cont.noPriceFor', ticker));
        selectAndChangeInputValue(priceInput, fixed02(price));
        log.info(t('act.cont.priceFor', ticker, fixed02(price), data.currency));
      },
    });

    // Set location address.
    const addressContainers = _$$(anchor, C.AddressSelector.container);
    assert(addressContainers.length >= 1 && data.location.length > 0, t('act.cont.noLocation'));
    await waitAct(t('act.cont.setLocationAsk', data.location));
    const locationSet = await selectAddress(addressContainers[0], data.location);
    assert(locationSet, t('act.cont.locationFailed', data.location));
    log.info(t('act.cont.locationSet', data.location));

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

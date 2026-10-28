import {
  changeSelectIndex,
  changeTextAreaValue,
  clickElement,
  focusElement,
  selectAndChangeInputValue,
  selectMaterialInMaterialSelector,
} from '@src/util';
import { sleep } from '@src/utils/sleep';
import { fixed0 } from '@src/utils/format';
import { contractDraftsStore } from '@src/infrastructure/prun-api/data/contract-drafts';
import { ActionStepExecuteContext, AssertFn } from '@src/features/XIT/ACT/shared-types';
import { maxContractDays, minContractDays } from '@src/features/XIT/ACT/actions/cont-limits';
import { t } from '@src/i18n';

// Truncate generated text to the game's form limits to avoid field rejection.
const maxNameLength = 50;
const maxPreambleLength = 250;

export async function pollUntil<T>(
  produce: () => T,
  timeout: number,
  interval = 100,
): Promise<T | undefined> {
  const deadline = Date.now() + timeout;
  while (true) {
    const result = produce();
    if (result) {
      return result;
    }
    if (Date.now() >= deadline) {
      return undefined;
    }
    await sleep(interval);
  }
}

const hasText = (text: string | undefined) => (x: Element) =>
  text !== undefined && x.textContent?.trim().toLowerCase() === text.trim().toLowerCase();

function findButton(anchor: Element, text: string | undefined) {
  return _$$(anchor, C.Button.btn).find(hasText(text)) as HTMLButtonElement | undefined;
}

function truncate(text: string, limit: number) {
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

/**
 * Finds the "Create New" button in the requested CONTD tile, clicks it, and waits for the
 * new draft to appear in the store.
 */
export async function createNewDraft(ctx: ActionStepExecuteContext<unknown>, tile: PrunTile) {
  const { anchor } = tile;
  const assert: AssertFn = ctx.assert;
  const { log, setStatus } = ctx;

  setStatus(t('act.cont.lookingCreate'));

  const findCreateButton = () => findButton(anchor, L.ContractDrafts.actions.create());

  const createBtn = await pollUntil(findCreateButton, 10000);
  assert(createBtn, t('act.cont.noCreate'));

  const beforeIds = new Set((contractDraftsStore.all.value ?? []).map(x => x.naturalId));
  await clickElement(createBtn);
  await ctx.waitActionFeedback(tile);

  setStatus(t('act.cont.waitDraft'));
  const newDraft = await pollUntil(
    () => (contractDraftsStore.all.value ?? []).find(x => !beforeIds.has(x.naturalId)),
    8000,
  );
  assert(newDraft, t('act.cont.noNewDraft'));
  log.info(t('act.cont.newDraft', newDraft.naturalId));
  return newDraft;
}

/**
 * Sets the contract name (first input) and preamble (textarea).
 */
export async function setDraftNameAndPreamble(
  ctx: ActionStepExecuteContext<unknown>,
  anchor: Element,
  name: string,
  preamble: string,
) {
  const assert: AssertFn = ctx.assert;
  const { log, setStatus } = ctx;

  setStatus(t('act.cont.settingName'));

  // Use a timeout; await $() would hang if the form never renders.
  const nameInput = await pollUntil(() => _$(anchor, 'input'), 5000);
  assert(nameInput, t('act.cont.noName'));
  selectAndChangeInputValue(nameInput, truncate(name, maxNameLength));
  log.info(t('act.cont.nameSet', name));

  const preambleInput = _$(anchor, 'textarea');
  assert(preambleInput, t('act.cont.noPreamble'));
  focusElement(preambleInput);
  changeTextAreaValue(preambleInput, truncate(preamble, maxPreambleLength));
  log.info(t('act.cont.preambleSet'));
}

/**
 * Clicks the draft-details save button and waits for the server to echo the
 * saved name and preamble back into the store.
 */
export async function saveDraftDetails(
  ctx: ActionStepExecuteContext<unknown>,
  tile: PrunTile,
  draftId: string,
) {
  const { anchor } = tile;
  const assert: AssertFn = ctx.assert;
  const { log, setStatus } = ctx;

  setStatus(t('act.cont.savingDetails'));

  const before = contractDraftsStore.getByNaturalId(draftId);
  // Compare the form's actual values because the game may reformat them.
  const name = _$(anchor, 'input')?.value;
  const preamble = _$(anchor, 'textarea')?.value;
  const saveBtn = findButton(anchor, L.ContractDraft.action.save());
  assert(saveBtn && !saveBtn.classList.contains(C.Button.disabled), t('act.cont.saveDisabled'));
  await clickElement(saveBtn);
  await ctx.waitActionFeedback(tile);

  const saved = await pollUntil(() => {
    const draft = contractDraftsStore.getByNaturalId(draftId);
    return (
      draft !== undefined && draft !== before && draft.name === name && draft.preamble === preamble
    );
  }, 8000);
  assert(saved, t('act.cont.notSaved'));
  log.info(t('act.cont.detailsSaved'));
}

/**
 * Clicks "Select Template" and returns the template type <select>.
 */
export async function openTemplate(ctx: ActionStepExecuteContext<unknown>, anchor: Element) {
  const assert: AssertFn = ctx.assert;
  const { setStatus } = ctx;

  setStatus(t('act.cont.openingTemplate'));

  const templateBtn = await pollUntil(
    () => findButton(anchor, L.ContractDraft.action.template()),
    5000,
  );
  assert(templateBtn, t('act.cont.noTemplateBtn'));
  await clickElement(templateBtn);

  const templateSelect = await pollUntil(() => {
    const container = _$(anchor, C.TemplateSelection.templateTypeSelect);
    return container === undefined ? undefined : _$(container, 'select');
  }, 5000);
  assert(templateSelect, t('act.cont.noTemplateSelect'));
  return templateSelect;
}

// Maps stored action values to the game's select option values.
const templateValueMap: Record<string, string> = {
  BUYING: 'BUY',
  SELLING: 'SELL',
};

export function selectTemplateType(
  ctx: ActionStepExecuteContext<unknown>,
  templateSelect: HTMLSelectElement,
  templateValue: string,
) {
  const assert: AssertFn = ctx.assert;
  const mapped = templateValueMap[templateValue] ?? templateValue;
  const index = Array.from(templateSelect.options).findIndex(x => x.value === mapped);
  assert(index >= 0, t('act.cont.noTemplate', templateValue));
  changeSelectIndex(templateSelect, index);
  ctx.log.info(t('act.cont.templateSelected', templateValue));
}

export async function setCurrency(
  ctx: ActionStepExecuteContext<unknown>,
  anchor: Element,
  currency: string,
) {
  const assert: AssertFn = ctx.assert;
  const { log } = ctx;

  const currencySelect = await pollUntil(
    () => _$$(anchor, 'select').find(x => Array.from(x.options).some(o => o.value === currency)),
    3000,
  );
  assert(currencySelect, t('act.cont.noCurrency', currency));
  const index = Array.from(currencySelect.options).findIndex(x => x.value === currency);
  changeSelectIndex(currencySelect, index);
  log.info(t('act.cont.currencySet', currency));
}

export interface MaterialEntry {
  ticker: string;
  amount: number;
}

export interface AddMaterialsOptions {
  /** Called after each material row is set up, with the group element and ticker. */
  setPrice?: (group: Element, ticker: string) => void;
}

/**
 * Add rows after the first and set each material and amount.
 * Like contd-paste-import/draft-form.ts importMaterials(), but driven by an ACT step.
 */
export async function addMaterials(
  ctx: ActionStepExecuteContext<unknown>,
  anchor: Element,
  materials: MaterialEntry[],
  options?: AddMaterialsOptions,
) {
  const assert: AssertFn = ctx.assert;
  const { log, setStatus } = ctx;

  setStatus(t('act.cont.addingMaterials'));

  const findAddButton = () =>
    _$$(anchor, 'button').find(
      x =>
        hasText(L.TemplateSelection.action.addShipment())(x) ||
        hasText(L.TemplateSelection.action.addCommodity())(x),
    );

  for (let i = 0; i < materials.length; i++) {
    const material = materials[i];

    if (i > 0) {
      const addBtn = findAddButton();
      assert(addBtn, t('act.cont.noAddBtn', material.ticker));
      await clickElement(addBtn);
    }

    // Select by index: extra template rows make the last row an unsafe target.
    const group = await pollUntil(() => _$$(anchor, C.TemplateSelection.group).at(i), 2000);
    assert(group, t('act.cont.noGroup', material.ticker));

    const amountInput = _$$(group, 'input').find(x => x.inputMode === 'numeric');
    assert(amountInput, t('act.cont.noAmountFor', material.ticker));
    selectAndChangeInputValue(amountInput, String(material.amount));

    const matSelector = _$(group, C.MaterialSelector.container);
    assert(matSelector, t('act.cont.noMatSelector', material.ticker));
    const selected = await selectMaterialInMaterialSelector(matSelector, material.ticker);
    assert(selected, t('act.cont.noSelect', material.ticker));
    log.info(t('act.cont.added', material.ticker, fixed0(material.amount)));

    options?.setPrice?.(group, material.ticker);
  }
}

/**
 * Sets the deadline (days to fulfill) input.
 */
export function setDeadline(ctx: ActionStepExecuteContext<unknown>, anchor: Element, days: number) {
  const assert: AssertFn = ctx.assert;
  const { log } = ctx;

  assert(
    Number.isInteger(days) && days >= minContractDays && days <= maxContractDays,
    t('act.cont.deadlineRange', minContractDays, maxContractDays),
  );

  const deadlineInput = _$$(anchor, 'input').find(x => x.name === 'deadline');
  assert(deadlineInput, t('act.cont.noDeadline'));
  selectAndChangeInputValue(deadlineInput, String(days));
  log.info(t('act.cont.deadlineSet', fixed0(days)));
}

/**
 * Apply the template and wait for updated conditions from the server.
 * The button's disabled class flickers on render and cannot confirm acceptance.
 */
export async function applyTemplate(
  ctx: ActionStepExecuteContext<unknown>,
  anchor: Element,
  draftId: string,
) {
  const assert: AssertFn = ctx.assert;
  const { log, setStatus } = ctx;

  setStatus(t('act.cont.applyingTemplate'));

  const applyBtn = await pollUntil(
    () => findButton(anchor, L.TemplateSelection.action.template()),
    5000,
  );
  assert(applyBtn, t('act.cont.noApply'));
  assert(
    !applyBtn.disabled && !applyBtn.classList.contains(C.Button.disabled),
    t('act.cont.templateInvalid'),
  );

  const before = contractDraftsStore.getByNaturalId(draftId);
  await clickElement(applyBtn);

  const applied = await pollUntil(() => {
    const draft = contractDraftsStore.getByNaturalId(draftId);
    return draft !== undefined && draft !== before && draft.conditions.length > 0;
  }, 8000);
  assert(applied, t('act.cont.notApplied'));
  log.info(t('act.cont.templateApplied'));
}

/**
 * Clicks the conditions save button and waits for the draft to come back valid.
 */
export async function saveConditions(
  ctx: ActionStepExecuteContext<unknown>,
  tile: PrunTile,
  draftId: string,
) {
  const { anchor } = tile;
  const assert: AssertFn = ctx.assert;
  const { log, setStatus } = ctx;

  setStatus(t('act.cont.savingCond'));

  const before = contractDraftsStore.getByNaturalId(draftId);
  const condSaveBtn = _$$(anchor, C.Button.btn).findLast(
    hasText(L.ContractDraftSend.action.save()),
  );
  assert(
    condSaveBtn && !condSaveBtn.classList.contains(C.Button.disabled),
    t('act.cont.condSaveDisabled'),
  );
  await clickElement(condSaveBtn);
  await ctx.waitActionFeedback(tile);

  const saved = await pollUntil(() => {
    const draft = contractDraftsStore.getByNaturalId(draftId);
    return (
      draft !== undefined &&
      draft !== before &&
      draft.status === 'VALID' &&
      draft.conditions.length > 0
    );
  }, 8000);
  assert(saved, t('act.cont.condNotSaved'));
  log.info(t('act.cont.condSaved'));
}

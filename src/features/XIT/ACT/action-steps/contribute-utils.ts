import { clickElement } from '@src/util';
import { sleep } from '@src/utils/sleep';

// Contribution tables (POPID upkeep, COGCU) have one slider per material and no number field.
// The slider handle takes keyboard input, so Home and ArrowRight set an exact value.

function key(element: Element, name: string, code: number) {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
  // Some slider versions read the legacy key codes.
  Object.defineProperty(event, 'keyCode', { get: () => code });
  Object.defineProperty(event, 'which', { get: () => code });
  element.dispatchEvent(event);
}

function sliderValue(handle: Element) {
  const value = Number(handle.getAttribute('aria-valuenow'));
  return Number.isFinite(value) ? value : undefined;
}

// Sets the slider to `amount`, or to its maximum when that is lower. Returns the set value.
export async function setSliderValue(slider: Element, amount: number) {
  const handle = slider.getElementsByClassName('rc-slider-handle')[0] as HTMLElement | undefined;
  if (!handle) {
    return undefined;
  }
  handle.focus();
  key(handle, 'Home', 36);
  await sleep(0);
  for (let i = 0; i < amount; i++) {
    const before = sliderValue(handle);
    key(handle, 'ArrowRight', 39);
    // Stop at the maximum: the value no longer grows.
    if (i % 10 === 9) {
      await sleep(0);
      if (sliderValue(handle) === before) {
        break;
      }
    }
  }
  await sleep(0);
  handle.blur();
  return sliderValue(handle);
}

// The material ticker of a contribution row.
export function rowTicker(row: Element) {
  return row.getElementsByClassName(C.ColoredIcon.label)[0]?.textContent?.trim();
}

// The first contribution block of the tile (the upkeep block in POPID).
export async function findContributionTable(anchor: HTMLElement) {
  const contribute = await $(anchor, C.Contribution.contribute);
  const table = contribute.previousElementSibling;
  // Let features that change the sliders on open (COGCU max) finish first.
  await sleep(500);
  return { contribute, table };
}

// Sets every slider in the table: listed materials to their amounts, the rest to 0.
export async function fillContribution(table: Element, materials: Record<string, number>) {
  const result: Record<string, number | undefined> = {};
  for (const row of Array.from(table.getElementsByTagName('tr'))) {
    const ticker = rowTicker(row);
    const slider = row.getElementsByClassName('rc-slider')[0];
    if (ticker === undefined || slider === undefined) {
      continue;
    }
    const amount = materials[ticker] ?? 0;
    if (slider.classList.contains('rc-slider-disabled')) {
      result[ticker] = amount > 0 ? 0 : undefined;
      continue;
    }
    const value = await setSliderValue(slider, amount);
    if (amount > 0) {
      result[ticker] = value;
    }
  }
  return result;
}

// The contribute button is the last button of the block.
export async function clickContribute(contribute: Element) {
  const buttons = Array.from(contribute.getElementsByClassName(C.Button.btn)) as HTMLElement[];
  await clickElement(buttons.at(-1));
}

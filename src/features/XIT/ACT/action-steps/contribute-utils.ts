import { clickElement } from '@src/util';
import { sleep } from '@src/utils/sleep';

// Contribution tables (POPID upkeep, COGCU) have one slider per material and no number field.
// The game keeps the amount in its own state. It takes a new amount only through the slider
// callbacks (onChange, then onChangeComplete). Key presses move the handle, but the game
// does not get the amount, so the contribute button stays off.

interface SliderCallbacks {
  onChange: (value: number) => void;
  onChangeComplete?: (value: number) => void;
}

interface Fiber {
  memoizedProps?: Record<string, unknown>;
  return?: Fiber;
}

// The props of the slider component, read from the React fiber of the slider element.
function sliderCallbacks(slider: Element): SliderCallbacks | undefined {
  const fiberKey = Object.keys(slider).find(x => x.startsWith('__reactFiber'));
  let fiber = fiberKey ? (slider as unknown as Record<string, Fiber>)[fiberKey] : undefined;
  for (let i = 0; i < 6 && fiber; i++, fiber = fiber.return) {
    const props = fiber.memoizedProps;
    if (typeof props?.onChange === 'function' && typeof props.onChangeComplete === 'function') {
      return props as unknown as SliderCallbacks;
    }
  }
  return undefined;
}

function sliderAttribute(handle: Element, name: string) {
  const value = Number(handle.getAttribute(name));
  return Number.isFinite(value) ? value : undefined;
}

export interface SliderResult {
  value?: number;
  max?: number;
}

// Sets the slider to `amount`, or to its maximum when that is lower.
export async function setSliderValue(slider: Element, amount: number): Promise<SliderResult> {
  const handle = slider.getElementsByClassName('rc-slider-handle')[0] as HTMLElement | undefined;
  if (!handle) {
    return {};
  }
  const value = () => sliderAttribute(handle, 'aria-valuenow');
  const max = sliderAttribute(handle, 'aria-valuemax');
  const target = Math.max(0, max !== undefined ? Math.min(amount, max) : amount);
  const callbacks = sliderCallbacks(slider);
  if (callbacks) {
    callbacks.onChange(target);
    callbacks.onChangeComplete?.(target);
    await sleep(50);
  }
  // Fallback: the marks at the ends of the slider also send the amount to the game.
  if (value() !== target && (target === 0 || target === max)) {
    const marks = slider.getElementsByClassName('rc-slider-mark')[0];
    const mark = target === 0 ? marks?.firstElementChild : marks?.lastElementChild;
    await clickElement(mark as HTMLElement | null);
    await sleep(50);
  }
  return { value: value(), max };
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
  const result: Record<string, SliderResult | undefined> = {};
  for (const row of Array.from(table.getElementsByTagName('tr'))) {
    const ticker = rowTicker(row);
    const slider = row.getElementsByClassName('rc-slider')[0];
    if (ticker === undefined || slider === undefined) {
      continue;
    }
    const amount = materials[ticker] ?? 0;
    if (slider.classList.contains('rc-slider-disabled')) {
      result[ticker] = amount > 0 ? { value: 0, max: 0 } : undefined;
      continue;
    }
    const set = await setSliderValue(slider, amount);
    if (amount > 0) {
      result[ticker] = set;
    }
  }
  return result;
}

// The contribute button is the last button of the block.
export async function clickContribute(contribute: Element) {
  const buttons = Array.from(contribute.getElementsByClassName(C.Button.btn)) as HTMLElement[];
  await clickElement(buttons.at(-1));
}

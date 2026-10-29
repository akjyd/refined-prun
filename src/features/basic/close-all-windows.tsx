import { closePrunWindow } from '@src/infrastructure/prun-ui/utils/close-prun-window';
import { sleep } from '@src/utils/sleep';
import { t } from '@src/i18n';
import $style from './close-all-windows.module.css';

let isClosing = false;

async function closeAllWindows() {
  if (isClosing) {
    return;
  }
  isClosing = true;
  try {
    // Minimized windows can't be closed from the dock; restore them first.
    for (const indicator of _$$(document, C.Dock.indicatorMinimized)) {
      const dockItem = indicator.closest<HTMLElement>(`.${C.Dock.buffer}`);
      if (dockItem) {
        dockItem.click();
        await sleep(50);
      }
    }
    for (const window of _$$(document, C.Window.window)) {
      try {
        closePrunWindow(window);
      } catch {
        // A window without a close button (for example, one that is still opening) stays open.
      }
      await sleep(50);
    }
  } finally {
    isClosing = false;
  }
}

function onFooterReady(footer: HTMLElement) {
  createFragmentApp(() => (
    <div
      class={[$style.container, C.HeadItem.container, C.fonts.fontRegular, C.type.typeRegular]}
      onClick={() => void closeAllWindows()}>
      <div class={[C.HeadItem.indicator, C.HeadItem.indicatorSuccess]} />
      <div class={[$style.label, C.HeadItem.label]}>{t('feat.closeAll.label')}</div>
    </div>
  )).prependTo(footer);
}

function init() {
  subscribe($$(document, C.Frame.foot), onFooterReady);
}

features.add(
  import.meta.url,
  init,
  'Adds a bottom-left button that closes all floating windows, including minimized ones.',
);

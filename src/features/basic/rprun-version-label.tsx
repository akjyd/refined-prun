import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import $style from './rprun-version-label.module.css';
import { cxStore, fetchPrices } from '@src/infrastructure/fio/cx';
import { refreshProfitData } from '@src/infrastructure/prunplanner/profit-data';
import { timestampEachMinute } from '@src/utils/dayjs';
import { t } from '@src/i18n';

// Minutes since the prices were downloaded.
const priceAge = computed(() =>
  cxStore.age > 0
    ? Math.max(0, Math.floor((timestampEachMinute.value - cxStore.age) / 60000))
    : undefined,
);

function refresh(e: MouseEvent) {
  e.stopPropagation();
  void fetchPrices();
  refreshProfitData();
}

async function onFooterReady(footer: HTMLElement) {
  const userCount = await $(footer, C.UsersOnlineCount.container);

  function onClick() {
    showBuffer('XIT WHATSNEW');
  }

  createFragmentApp(() => (
    <div
      class={[$style.container, C.HeadItem.container, C.fonts.fontRegular, C.type.typeRegular]}
      onClick={onClick}>
      <div class={[C.HeadItem.indicator, C.HeadItem.indicatorSuccess]} />
      <div
        class={[$style.label, C.HeadItem.label]}
        data-tooltip="Refined PrUn version."
        data-tooltip-position="top">
        v{config.version}
      </div>
      <div class={[$style.label, C.HeadItem.label, $style.refresh]} onClick={refresh}>
        {priceAge.value !== undefined ? t('version.priceAge', priceAge.value) : ''} ↻
      </div>
    </div>
  )).before(userCount);
}

function init() {
  applyCssRule(`.${C.Frame.foot}`, $style.foot);
  subscribe($$(document, C.Frame.foot), onFooterReady);
}

features.add(import.meta.url, init, 'Adds a bottom-right "Refined PrUn version" label.');

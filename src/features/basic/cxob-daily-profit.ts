import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { refPrunId } from '@src/infrastructure/prun-ui/attributes';
import { watchEffectWhileNodeAlive } from '@src/utils/watch';
import { orderProfit } from '@src/core/daily-profit/order-profit';
import PlanetPicker from '@src/components/PlanetPicker.vue';
import { formatProfit, profitMarks } from '@src/core/daily-profit/profit-format';
import $style from './cxob-daily-profit.module.css';
import { t } from '@src/i18n';

// Replaces the trader name with the daily profit of one base that sells the material at the
// order price, the same way as XIT CX4 and XIT ORDERS (see order-profit.ts).
function onTileReady(tile: PrunTile) {
  const orderBook = computed(() => cxobStore.getByTicker(tile.parameter));
  const prices = computed(() => {
    const book = orderBook.value;
    if (!book) {
      return new Map<string, number>();
    }
    return new Map(
      [...book.sellingOrders, ...book.buyingOrders].map(x => [x.id, x.limit.amount] as const),
    );
  });
  const profits = computed(() => {
    const book = orderBook.value;
    const result = new Map<string, number | undefined>();
    if (!book) {
      return result;
    }
    const profitAt = orderProfit(book.material.ticker, book.exchange.code);
    for (const [id, price] of prices.value) {
      result.set(id, profitAt(price));
    }
    return result;
  });
  const marks = computed(() =>
    profitMarks(
      [...prices.value].map(([id, price]) => ({ id, price, profit: profits.value.get(id) })),
    ),
  );

  subscribe($$(tile.anchor, 'tr'), tr => {
    const id = refPrunId(tr);
    const nameCell = tr.children[0] as HTMLElement | undefined;
    if (!nameCell || tr.children.length < 3) {
      return;
    }
    const isHead = tr.parentElement?.tagName === 'THEAD';
    const label = document.createElement('span');
    label.style.fontSize = getComputedStyle(nameCell).fontSize;
    nameCell.appendChild(label);
    if (isHead) {
      // The planet behind the daily profit of a raw material.
      const [ticker, exchange] = (tile.parameter ?? '').split('.');
      if (ticker && exchange) {
        createFragmentApp(PlanetPicker, { ticker, exchange }).appendTo(nameCell);
      }
    }
    watchEffectWhileNodeAlive(tr, () => {
      const price = prices.value.get(id.value ?? '');
      // Only order rows and the column title change; other rows keep their text.
      nameCell.classList.toggle($style.cell, isHead || price !== undefined);
      if (isHead) {
        label.textContent = t('cxob.profitHead');
        return;
      }
      const profit = profits.value.get(id.value ?? '');
      label.textContent = price !== undefined ? formatProfit(profit) : '';
      label.className = [$style.profit, marks.value.get(id.value ?? '')].filter(Boolean).join(' ');
    });
  });
}

function init() {
  tiles.observe('CXOB', onTileReady);
}

features.add(
  import.meta.url,
  init,
  'CXOB: Replaces the trader name with the daily profit of one base selling at the order price.',
);

import { cxobStore } from '@src/infrastructure/prun-api/data/cxob';
import { refPrunId } from '@src/infrastructure/prun-ui/attributes';
import { watchEffectWhileNodeAlive } from '@src/utils/watch';
import {
  chosenRecipe,
  exchangePrice,
  profitOf,
  withPrice,
} from '@src/core/daily-profit/recipe-choice';
import { formatProfit, profitClass } from '@src/core/daily-profit/profit-format';
import $style from './cxob-daily-profit.module.css';
import { t } from '@src/i18n';

// Replaces the trader name with the daily profit of one base that sells the material at the
// order price. The recipe is the one picked in XIT RECIPES; other prices are the 30-day VWAP
// of this exchange. Extracted materials have no recipe and show "--".
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
  const recipe = computed(() => {
    const ticker = orderBook.value?.material.ticker;
    return ticker !== undefined ? chosenRecipe(ticker) : undefined;
  });

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
    watchEffectWhileNodeAlive(tr, () => {
      const book = orderBook.value;
      const price = prices.value.get(id.value ?? '');
      // Only order rows and the column title change; other rows keep their text.
      nameCell.classList.toggle($style.cell, isHead || price !== undefined);
      if (isHead) {
        label.textContent = t('cxob.profitHead');
        return;
      }
      const r = recipe.value;
      let profit: number | undefined;
      if (book && price !== undefined && r) {
        const base = exchangePrice(book.exchange.code);
        profit = profitOf(r, withPrice(base, book.material.ticker, price));
      }
      label.textContent = price !== undefined ? formatProfit(profit) : '';
      label.className = [$style.profit, profitClass(profit)].filter(Boolean).join(' ');
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

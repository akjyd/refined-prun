import { act } from '@src/features/XIT/ACT/act-registry';
import {
  clickContribute,
  fillContribution,
  findContributionTable,
  rowTicker,
} from '@src/features/XIT/ACT/action-steps/contribute-utils';
import { fixed0 } from '@src/utils/format';
import { userData } from '@src/store/user-data';
import { waitUntil } from '@src/utils/wait';
import { t } from '@src/i18n';

interface Data {
  planet: string;
  // Building ticker for POPID; undefined for the CoGC (COGCU).
  building?: string;
  materials: Record<string, number>;
}

function materialsText(materials: Record<string, number>) {
  return Object.entries(materials)
    .map(([ticker, amount]) => `${fixed0(amount)} ${ticker}`)
    .join(', ');
}

// The materials the contribution table of this building (or the CoGC) must show.
function expectedTickers(data: Data) {
  const planet = userData.govburn.planets[data.planet];
  const tickers =
    data.building !== undefined
      ? planet?.buildings.find(x => x.ticker === data.building)?.upkeeps?.map(x => x.ticker)
      : planet?.cogc?.materials.map(x => x.ticker);
  return tickers !== undefined && tickers.length > 0 ? new Set(tickers) : undefined;
}

function tableTickers(anchor: HTMLElement) {
  const contribute = anchor.getElementsByClassName(C.Contribution.contribute)[0];
  const table = contribute?.previousElementSibling;
  if (!table) {
    return undefined;
  }
  const tickers = Array.from(table.getElementsByTagName('tr')).map(rowTicker);
  return new Set(tickers.filter(x => x !== undefined));
}

// True when the table shows the rows of this building, not the rows of the window's
// previous command. The game reuses the window and can show the old rows for a moment.
function showsTarget(anchor: HTMLElement, data: Data) {
  const shown = tableTickers(anchor);
  if (shown === undefined) {
    return false;
  }
  const expected = expectedTickers(data);
  if (expected !== undefined) {
    return shown.size === expected.size && [...expected].every(x => shown.has(x));
  }
  return Object.keys(data.materials).every(x => shown.has(x));
}

// Contributes materials from the base on the planet to a population building or the CoGC.
export const CONTRIBUTE = act.addActionStep<Data>({
  type: 'CONTRIBUTE',
  description: data =>
    t('act.contribute.desc', materialsText(data.materials), data.building ?? 'COGC', data.planet),
  execute: async ctx => {
    const { data, log, requestTile, setStatus, waitAct, waitActionFeedback, complete, skip } = ctx;
    const command =
      data.building !== undefined
        ? `POPID P-${data.planet} T-${data.building}`
        : `COGCU ${data.planet}`;
    const requested = await requestTile(command);
    if (!requested) {
      return;
    }
    setStatus(t('act.contribute.setup'));
    // When the window changes its command, the returned tile can be the old frame.
    // Find the live tile again and wait until its table shows the rows of this target.
    const liveTile = () => {
      const found = tiles.find(command, true)[0] ?? requested;
      return found.anchor.isConnected ? found : undefined;
    };
    const ready = await waitUntil(() => {
      const anchor = liveTile()?.anchor;
      return anchor !== undefined && showsTarget(anchor, data);
    }, 15000);
    const tile = liveTile();
    if (!ready || !tile) {
      log.warning(t('act.contribute.noTable', command));
      skip();
      return;
    }
    const { contribute, table } = await findContributionTable(tile.anchor);
    if (!table) {
      log.warning(t('act.contribute.noTable', command));
      skip();
      return;
    }
    const set = await fillContribution(table, data.materials);
    let total = 0;
    for (const [ticker, amount] of Object.entries(data.materials)) {
      const value = set[ticker]?.value;
      if (value === undefined) {
        log.warning(t('act.contribute.noRow', ticker, command));
        continue;
      }
      if (value < amount) {
        log.warning(
          t(
            'act.contribute.short',
            ticker,
            fixed0(value),
            fixed0(amount),
            set[ticker]?.max !== undefined ? fixed0(set[ticker].max) : '?',
          ),
        );
      }
      total += value;
    }
    if (total <= 0) {
      skip();
      return;
    }
    await waitAct();
    await clickContribute(contribute);
    // A payment that completes the CoGC bill redraws the tile, and the feedback then shows in
    // the new frame. Wait for the feedback in whichever frame is live.
    const hasFeedback = (x: PrunTile) =>
      x.frame.getElementsByClassName(C.ActionFeedback.overlay).length > 0;
    await waitUntil(() => {
      const now = liveTile();
      return now !== undefined && (now.frame !== tile.frame || hasFeedback(now));
    }, 5000);
    await waitActionFeedback(liveTile() ?? tile);
    complete();
  },
});

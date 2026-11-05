import { act } from '@src/features/XIT/ACT/act-registry';
import { cogcsStore } from '@src/infrastructure/prun-api/data/cogcs';
import { companyStore } from '@src/infrastructure/prun-api/data/company';
import { lookupLocalization } from '@src/infrastructure/prun-ui/i18n';
import { clickElement } from '@src/util';
import { waitUntil } from '@src/utils/wait';
import { userData } from '@src/store/user-data';
import { t } from '@src/i18n';

interface Data {
  planet: string;
}

interface Fiber {
  memoizedProps?: Record<string, unknown>;
  return?: Fiber;
}

// The program of the period that runs now.
export function currentProgram(cogc: PrunApi.Cogc | undefined, now: number) {
  return cogc?.programs?.find(x => x.start.timestamp <= now && now < x.end.timestamp)?.type;
}

// What to vote: the program that runs now; else the planet's default program set in XIT GOVBURN;
// else the latest past period with a program (player, 2026-11-05).
export function programToVote(cogc: PrunApi.Cogc | undefined, planet: string, now: number) {
  const current = currentProgram(cogc, now);
  if (current !== undefined && current !== null) {
    return current;
  }
  const preset = userData.govburn.config.cogcPrograms[planet];
  if (preset !== undefined) {
    return preset;
  }
  return cogc?.programs?.find(x => x.end.timestamp <= now && x.type !== null)?.type ?? undefined;
}

function programName(type: string) {
  const name = lookupLocalization(L.CoGCProgram, type) as (() => string) | undefined;
  return name?.() ?? type;
}

// True when a React component above the element has the program type in its props.
function fiberHasType(element: Element, type: string) {
  const key = Object.keys(element).find(x => x.startsWith('__reactFiber'));
  let fiber = key ? (element as unknown as Record<string, Fiber>)[key] : undefined;
  for (let i = 0; i < 6 && fiber; i++) {
    for (const value of Object.values(fiber.memoizedProps ?? {})) {
      if (value === type) {
        return true;
      }
      if (
        typeof value === 'object' &&
        value !== null &&
        (value as { type?: unknown }).type === type
      ) {
        return true;
      }
    }
    fiber = fiber.return;
  }
  return false;
}

// The vote button of the program row in COGCPEX. The row is found by its React props, and by
// the program name when the props do not have the type.
function voteButton(anchor: HTMLElement, type: string) {
  const rows = Array.from(anchor.getElementsByTagName('tr'));
  const name = programName(type);
  const row =
    rows.find(x => fiberHasType(x, type)) ??
    rows.find(x => Array.from(x.cells).some(cell => cell.textContent?.trim() === name));
  return row?.getElementsByTagName('button')[0];
}

// Votes the program that runs now, so the CoGC keeps it in the next period.
export const VOTE_COGC = act.addActionStep<Data>({
  type: 'VOTE_COGC',
  description: data => t('act.vote.desc', data.planet),
  execute: async ctx => {
    const { data, log, requestTile, waitAct, complete, skip, fail } = ctx;
    const command = `COGCPEX ${data.planet}`;
    const requested = await requestTile(command);
    if (!requested) {
      return;
    }
    const cogc = () => cogcsStore.getByPlanetNaturalId(data.planet);
    await waitUntil(() => cogc()?.programs !== undefined, 15000);
    if (cogc()?.programs === undefined) {
      log.warning(t('act.cogc.none', data.planet));
      skip();
      return;
    }
    const type = programToVote(cogc(), data.planet, Date.now());
    if (type === undefined || type === null) {
      log.info(t('act.vote.noProgram', data.planet));
      skip();
      return;
    }
    const myVote = () => cogc()?.votes?.find(x => x.voter.id === companyStore.value?.id)?.type;
    if (myVote() === type) {
      log.info(t('act.vote.already', programName(type), data.planet));
      skip();
      return;
    }
    const liveTile = () => {
      const found = tiles.find(command, true)[0] ?? requested;
      return found.anchor.isConnected ? found : undefined;
    };
    let button: HTMLButtonElement | undefined;
    await waitUntil(() => {
      const anchor = liveTile()?.anchor;
      button = anchor ? voteButton(anchor, type) : undefined;
      return button !== undefined;
    }, 10000);
    if (!button) {
      log.warning(t('act.vote.noRow', programName(type), command));
      skip();
      return;
    }
    await waitAct();
    await clickElement(button);
    const voted = await waitUntil(() => myVote() === type, 10000);
    if (!voted) {
      fail(t('act.vote.failed', programName(type), data.planet));
    }
    log.info(t('act.vote.done', programName(type), data.planet));
    complete();
  },
});

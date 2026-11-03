import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { getPrunId } from '@src/infrastructure/prun-ui/attributes';
import { createId } from '@src/store/create-id';
import { watchUntil } from '@src/utils/watch';
import css from '@src/utils/css-utils.module.css';

type Result = 'ok' | 'problem';

const results = reactive(new Map<string, Result>());
const running = reactive(new Set<string>());

// Show the window after this time, so a run that does not end is not hidden forever.
const revealAfterMs = 90_000;

// Called by the window that runs the command. An unknown run id does nothing.
export function reportHiddenRun(runId: string | undefined, result: Result) {
  if (runId) {
    results.set(runId, result);
  }
}

export function isHiddenRunning(key: string) {
  return running.has(key);
}

// Runs an XIT command in a hidden window. The run id is added as the last parameter.
// The window closes when the run ends without problems. When the run has a problem or
// takes too long, the window becomes visible, so the player can read its log.
// A second call with the same key does nothing while the first run is active.
export async function runHidden(key: string, command: string): Promise<Result | undefined> {
  if (running.has(key)) {
    return undefined;
  }
  running.add(key);
  const runId = createId();
  const timedOut = ref(false);
  const timer = setTimeout(() => (timedOut.value = true), revealAfterMs);
  const closeWhen = computed(() => results.get(runId) === 'ok');
  try {
    const window = await showBuffer(`${command} ${runId}`, {
      force: true,
      autoClose: true,
      closeWhen,
    });
    await watchUntil(() => results.has(runId) || timedOut.value);
    if (results.get(runId) !== 'ok' && window?.isConnected) {
      revealWindow(window);
    }
    return results.get(runId) ?? 'problem';
  } finally {
    clearTimeout(timer);
    running.delete(key);
  }
}

function revealWindow(window: Element) {
  window.classList.remove(css.hidden);
  const tile = _$(window, C.Tile.tile);
  const dockLabel = tile ? getPrunId(tile)?.padStart(2, '0') : undefined;
  const dockTab = _$$(document, C.Dock.buffer).find(
    x => _$(x, C.Dock.title)?.textContent === dockLabel,
  );
  dockTab?.classList.remove(css.hidden);
}

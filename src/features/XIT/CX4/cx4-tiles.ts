import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { dispatchClientPrunMessage } from '@src/infrastructure/prun-api/prun-api-listener';
import { UI_TILES_CHANGE_COMMAND } from '@src/infrastructure/prun-api/client-messages';
import { userData } from '@src/store/user-data';
import { sleep } from '@src/utils/sleep';
import { waitUntil } from '@src/utils/wait';

export const CX4_EXCHANGES = ['AI1', 'CI1', 'IC1', 'NC1'];

// Points the CXOB window of each exchange to the material. A window that is still open is
// changed in place, so it keeps the place the player gave it; a missing window is opened.
export async function showMaterial(ticker: string) {
  const recent = userData.cx4.recent.filter(x => x !== ticker);
  recent.unshift(ticker);
  userData.cx4.recent = recent.slice(0, 10);

  const active = tiles.snapshotMetadata();
  for (const code of CX4_EXCHANGES) {
    const command = `CXOB ${ticker}.${code}`;
    const id = userData.cx4.tiles[code];
    const tile = active.find(x => x.id === id && x.command === 'CXOB');
    if (tile) {
      if (tile.fullCommand !== command) {
        await changeCommand(tile.id, command);
      }
      continue;
    }
    await showBuffer(command, { force: true });
    const find = () => tiles.snapshotMetadata().findLast(x => x.fullCommand === command);
    await waitUntil(find, 3000);
    const opened = find();
    if (opened) {
      userData.cx4.tiles[code] = opened.id;
    }
  }
}

// The game first clears the command, then sets the new one, as in the tile ":" control.
async function changeCommand(id: string, command: string) {
  if (!dispatchClientPrunMessage(UI_TILES_CHANGE_COMMAND(id, null))) {
    return false;
  }
  await sleep(0);
  return dispatchClientPrunMessage(UI_TILES_CHANGE_COMMAND(id, command));
}

export function toggleFavorite(ticker: string) {
  const favorites = userData.cx4.favorites;
  userData.cx4.favorites = favorites.includes(ticker)
    ? favorites.filter(x => x !== ticker)
    : [...favorites, ticker].sort();
}

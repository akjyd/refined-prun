import { showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { dispatchClientPrunMessage } from '@src/infrastructure/prun-api/prun-api-listener';
import { UI_TILES_CHANGE_COMMAND } from '@src/infrastructure/prun-api/client-messages';
import { getPrunId } from '@src/infrastructure/prun-ui/attributes';
import { userData } from '@src/store/user-data';

export const CX4_EXCHANGES = ['AI1', 'CI1', 'IC1', 'NC1'];

// The game sends order book data only for open CXOB windows. XIT CX4 keeps one hidden CXOB
// window per exchange and changes its command when the player picks a material, so the
// order books update. The windows close when XIT CX4 closes.
const tileIds = new Map<string, string>();
let closeSignal = ref(false);

export async function showMaterial(ticker: string) {
  const recent = userData.cx4.recent.filter(x => x !== ticker);
  recent.unshift(ticker);
  userData.cx4.recent = recent.slice(0, 10);

  const active = new Set(tiles.snapshotMetadata().map(x => x.id));
  for (const code of CX4_EXCHANGES) {
    const command = `CXOB ${ticker}.${code}`;
    const id = tileIds.get(code);
    if (id !== undefined && active.has(id)) {
      if (dispatchClientPrunMessage(UI_TILES_CHANGE_COMMAND(id, command))) {
        continue;
      }
    }
    const window = await showBuffer(command, {
      force: true,
      autoClose: true,
      closeWhen: closeSignal,
    });
    const tile = window !== undefined ? _$(window, C.Tile.tile) : undefined;
    const tileId = tile ? getPrunId(tile) : null;
    if (tileId !== null) {
      tileIds.set(code, tileId);
    }
  }
}

export function closeHiddenBooks() {
  closeSignal.value = true;
  closeSignal = ref(false);
  tileIds.clear();
}

export function toggleFavorite(ticker: string) {
  const favorites = userData.cx4.favorites;
  userData.cx4.favorites = favorites.includes(ticker)
    ? favorites.filter(x => x !== ticker)
    : [...favorites, ticker].sort();
}

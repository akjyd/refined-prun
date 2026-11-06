import { revealedTiles, showBuffer } from '@src/infrastructure/prun-ui/buffers';
import { dispatchClientPrunMessage } from '@src/infrastructure/prun-api/prun-api-listener';
import { UI_TILES_CHANGE_COMMAND } from '@src/infrastructure/prun-api/client-messages';
import { getPrunId } from '@src/infrastructure/prun-ui/attributes';

// The game sends order book data only for open CXOB windows. A HiddenOrderBooks keeps hidden
// CXOB windows open for a list of order books. A window that is no longer needed gets the
// next needed command, so windows are reused. close() closes all of them.
export class HiddenOrderBooks {
  private tileIds: string[] = [];
  private shown = new Map<string, string>();
  private closeSignal = ref(false);
  private busy: Promise<void> = Promise.resolve();

  // The cxTickers look like 'AIR.NC1'. Calls run one after another.
  show(cxTickers: string[]) {
    const previous = this.busy;
    this.busy = (async () => {
      await previous;
      await this.apply(cxTickers);
    })();
    return this.busy;
  }

  close() {
    this.closeSignal.value = true;
    this.closeSignal = ref(false);
    this.tileIds = [];
    this.shown.clear();
  }

  private async apply(cxTickers: string[]) {
    // A window the player opened from the game (see revealWhenFocused) is theirs now.
    const active = new Set(
      tiles
        .snapshotMetadata()
        .map(x => x.id)
        .filter(x => !revealedTiles.has(x)),
    );
    this.tileIds = this.tileIds.filter(x => active.has(x));
    for (const [id] of this.shown) {
      if (!active.has(id)) {
        this.shown.delete(id);
      }
    }
    const wanted = new Set(cxTickers.map(x => `CXOB ${x}`));
    const missing = [...wanted].filter(x => ![...this.shown.values()].includes(x));
    const free = this.tileIds.filter(x => !wanted.has(this.shown.get(x) ?? ''));
    for (const command of missing) {
      const id = free.shift();
      if (id !== undefined && dispatchClientPrunMessage(UI_TILES_CHANGE_COMMAND(id, command))) {
        this.shown.set(id, command);
        continue;
      }
      const window = await showBuffer(command, {
        force: true,
        autoClose: true,
        closeWhen: this.closeSignal,
      });
      const tile = window !== undefined ? _$(window, C.Tile.tile) : undefined;
      const tileId = tile ? getPrunId(tile) : null;
      if (tileId !== null) {
        this.tileIds.push(tileId);
        this.shown.set(tileId, command);
      }
    }
  }
}

import $style from './flt-custom-order.module.css';
import { getPrunId } from '@src/infrastructure/prun-ui/attributes';
import { userData } from '@src/store/user-data';

// FLT: ships in an order you set by dragging rows, instead of by name (player, 2026-11-06).
// The game draws the table again when ships change, so the order is put back after each change.
// Ships not in the order yet stay in the game's order, after the ordered ones.

function rowsOf(tbody: HTMLTableSectionElement) {
  return Array.from(tbody.rows).filter(x => getPrunId(x) !== null);
}

function applyOrder(tbody: HTMLTableSectionElement) {
  const order = userData.fltOrder;
  if (order.length === 0) {
    return;
  }
  const rows = rowsOf(tbody);
  const rank = (row: HTMLTableRowElement) => {
    const index = order.indexOf(getPrunId(row)!);
    return index === -1 ? order.length : index;
  };
  const sorted = rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => (rank(a.row) !== rank(b.row) ? rank(a.row) - rank(b.row) : a.i - b.i))
    .map(x => x.row);
  if (sorted.every((row, i) => row === rows[i])) {
    return;
  }
  for (const row of sorted) {
    tbody.appendChild(row);
  }
}

function setupRow(tbody: HTMLTableSectionElement, row: HTMLTableRowElement, drag: { id?: string }) {
  if (row.dataset.rpzOrder !== undefined) {
    return;
  }
  row.dataset.rpzOrder = '';
  row.draggable = true;
  row.classList.add($style.row);
  const clearLine = () => row.classList.remove($style.dropAbove, $style.dropBelow);
  row.addEventListener('dragstart', e => {
    drag.id = getPrunId(row) ?? undefined;
    row.classList.add($style.dragging);
    e.dataTransfer?.setData('text/plain', drag.id ?? '');
  });
  row.addEventListener('dragend', () => {
    drag.id = undefined;
    row.classList.remove($style.dragging);
    for (const x of rowsOf(tbody)) {
      x.classList.remove($style.dropAbove, $style.dropBelow);
    }
  });
  row.addEventListener('dragover', e => {
    if (drag.id === undefined || drag.id === getPrunId(row)) {
      return;
    }
    e.preventDefault();
    const box = row.getBoundingClientRect();
    const above = e.clientY < box.top + box.height / 2;
    row.classList.toggle($style.dropAbove, above);
    row.classList.toggle($style.dropBelow, !above);
  });
  row.addEventListener('dragleave', clearLine);
  row.addEventListener('drop', e => {
    const target = getPrunId(row);
    if (drag.id === undefined || target === null || drag.id === target) {
      return;
    }
    e.preventDefault();
    const above = row.classList.contains($style.dropAbove);
    clearLine();
    const ids = rowsOf(tbody)
      .map(x => getPrunId(x)!)
      .filter(x => x !== drag.id);
    ids.splice(ids.indexOf(target) + (above ? 0 : 1), 0, drag.id);
    userData.fltOrder = ids;
    applyOrder(tbody);
  });
}

async function onTileReady(tile: PrunTile) {
  const tbody = await $(tile.anchor, 'tbody');
  const drag: { id?: string } = {};
  const refresh = () => {
    for (const row of rowsOf(tbody)) {
      setupRow(tbody, row, drag);
    }
    applyOrder(tbody);
  };
  refresh();
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) {
      return;
    }
    queued = true;
    queueMicrotask(() => {
      queued = false;
      refresh();
    });
  });
  observer.observe(tbody, { childList: true });
}

function init() {
  tiles.observe('FLT', onTileReady);
}

features.add(import.meta.url, init, 'FLT: Drag ship rows to set your own order.');

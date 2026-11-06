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

// A drag handle at the start of the row: only the handle starts a drag, so the pointer does not
// flicker over the whole table (player, 2026-11-06). The grip is drawn in CSS, not with a
// character: two '⋮' with negative letter spacing were almost invisible, and the Font Awesome
// grip measured 0 x 0 in the game (player, 2026-11-06).
function addHandle(
  row: HTMLTableRowElement,
  drag: { id?: string },
  tbody: HTMLTableSectionElement,
) {
  const cell = row.cells.item(0);
  if (cell === null || cell.querySelector(`.${$style.handle}`)) {
    return;
  }
  const handle = document.createElement('span');
  handle.className = $style.handle;
  handle.title = 'drag';
  handle.draggable = true;
  handle.addEventListener('click', e => e.stopPropagation());
  handle.addEventListener('dragstart', e => {
    e.stopPropagation();
    drag.id = getPrunId(row) ?? undefined;
    row.classList.add($style.dragging);
    e.dataTransfer?.setData('text/plain', drag.id ?? '');
    e.dataTransfer?.setDragImage(row, 8, row.offsetHeight / 2);
  });
  handle.addEventListener('dragend', () => {
    drag.id = undefined;
    row.classList.remove($style.dragging);
    for (const x of rowsOf(tbody)) {
      x.classList.remove($style.dropAbove, $style.dropBelow);
    }
  });
  cell.prepend(handle);
}

function setupRow(tbody: HTMLTableSectionElement, row: HTMLTableRowElement, drag: { id?: string }) {
  addHandle(row, drag, tbody);
  if (row.dataset.rpzOrder !== undefined) {
    return;
  }
  row.dataset.rpzOrder = '';
  const clearLine = () => row.classList.remove($style.dropAbove, $style.dropBelow);
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

// The table is watched as a whole: the game draws its rows again when a ship changes, and a row
// seen on its own may not be in its tbody yet (player, 2026-11-06: no handle was shown).
function onTileReady(tile: PrunTile) {
  const drag: { id?: string } = {};
  subscribe($$(tile.anchor, 'table'), table => {
    let queued = false;
    const refresh = () => {
      if (queued) {
        return;
      }
      queued = true;
      queueMicrotask(() => {
        queued = false;
        for (const tbody of Array.from(table.tBodies)) {
          for (const row of rowsOf(tbody)) {
            setupRow(tbody, row, drag);
          }
          applyOrder(tbody);
        }
      });
    };
    refresh();
    // Moving rows with applyOrder calls this again; the second pass finds the order right and
    // changes nothing, so it settles.
    new MutationObserver(refresh).observe(table, { childList: true, subtree: true });
  });
}

function init() {
  tiles.observe('FLT', onTileReady);
}

features.add(import.meta.url, init, 'FLT: Drag ship rows to set your own order.');

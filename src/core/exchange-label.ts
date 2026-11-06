// Exchanges by their station code (ANT, BEN, HRT, MOR, ARC, HUB) instead of the CX code (AI1,
// CI1, IC1, NC1, CI2, NC2), which are easy to mix up (player, 2026-11-06). Display only: data and
// game commands keep the CX code.
// Source: FIO /exchange/station (ComexCode → station NaturalId), 2026-11-05.
const LABELS: Record<string, string> = {
  AI1: 'ANT',
  CI1: 'BEN',
  IC1: 'HRT',
  NC1: 'MOR',
  CI2: 'ARC',
  NC2: 'HUB',
};

export function cxLabel(code: string | undefined) {
  return code === undefined ? '' : (LABELS[code] ?? code);
}

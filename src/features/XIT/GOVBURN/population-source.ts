import { planetsStore } from '@src/infrastructure/prun-api/data/planets';
import { populationsStore } from '@src/infrastructure/prun-api/data/populations';
import { NEEDS, PerTier, Report, TIERS } from '@src/core/population/engine';

// Population reports of a planet, oldest first.
// The game sends them when POPR opens; for other planets they come from FIO.

const FIO_TIER = ['Pioneer', 'Settler', 'Technician', 'Engineer', 'Scientist'];
const FIO_NEED = ['LifeSupport', 'Safety', 'Health', 'Comfort', 'Culture', 'Education'];

const fioReports = reactive(new Map<string, Report[]>());
const fioLoading = new Set<string>();

function fromGame(r: PrunApi.PopulationReport): Report {
  return {
    timestamp: r.time.timestamp,
    explorersGrace: r.explorersGraceEnabled,
    population: r.nextPopulation as PerTier,
    happiness: r.averageHappiness as PerTier,
    unemployment: r.unemploymentRate as PerTier,
    openJobs: r.openJobs as PerTier,
    fulfillment: NEEDS.map(n => r.needFulfillment[n] ?? 0),
    program: r.governmentProgramType,
  };
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') {
        i++;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += c;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const lines = rows.filter(x => x.some(y => y.trim() !== ''));
  const head = lines[0] ?? [];
  return lines.slice(1).map(x => Object.fromEntries(head.map((h, i) => [h.trim(), x[i] ?? ''])));
}

export function parseFioReports(text: string): Report[] {
  const rows = parseCsv(text);
  const number = (row: Record<string, string>, key: string) => {
    const value = parseFloat(row[key]);
    return Number.isFinite(value) ? value : 0;
  };
  const tiers = (row: Record<string, string>, prefix: string) =>
    Object.fromEntries(TIERS.map((t, i) => [t, number(row, prefix + FIO_TIER[i])])) as PerTier;
  return rows
    .map(row => ({
      period: number(row, 'SimulationPeriod'),
      report: {
        timestamp: number(row, 'TimestampMs'),
        explorersGrace: row.ExplorersGraceEnabled?.toLowerCase() === 'true',
        population: tiers(row, 'NextPopulation'),
        happiness: tiers(row, 'AverageHappiness'),
        unemployment: tiers(row, 'UnemploymentRate'),
        openJobs: tiers(row, 'OpenJobs'),
        fulfillment: FIO_NEED.map(n => number(row, 'NeedFulfillment' + n)),
        program: null,
      } as Report,
    }))
    .sort((a, b) => a.period - b.period)
    .map(x => x.report);
}

async function loadFio(naturalId: string) {
  if (fioLoading.has(naturalId)) {
    return;
  }
  fioLoading.add(naturalId);
  try {
    const url = `https://rest.fnar.net/csv/infrastructure/report/${encodeURIComponent(naturalId)}`;
    const response = await fetch(url);
    if (response.ok) {
      fioReports.set(naturalId, parseFioReports(await response.text()));
    }
  } catch {
    // No FIO data; the summary shows "--".
  }
}

// Reports from the game when known, else from FIO (loaded on first use).
export function getPopulationReports(naturalId: string): Report[] | undefined {
  const populationId = planetsStore.find(naturalId)?.populationId;
  const game = populationsStore.getById(populationId)?.reports;
  if (game !== undefined && game.length > 0) {
    return game.map(fromGame);
  }
  const fio = fioReports.get(naturalId);
  if (fio === undefined) {
    void loadFio(naturalId);
  }
  return fio;
}

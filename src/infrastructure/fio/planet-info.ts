// Planet data from FIO /planet/{id}: the current COGC program and the faction the planet
// belongs to. One request per planet, once per session. Until the answer arrives, or when FIO
// cannot be reached, the COGC falls back to the embedded snapshot and the faction is unknown.

interface FioCogcProgram {
  ProgramType: string | null;
  StartEpochMs: number;
  EndEpochMs: number;
}

const cogcs = shallowReactive(new Map<string, string>());
// 'AI', 'CI', 'IC', 'NC', or '' for a planet outside the factions.
const factions = shallowReactive(new Map<string, { code: string; name: string }>());
const requested = new Set<string>();
const queue: string[] = [];
let running = 0;
const maxRunning = 4;

// 'RESOURCE_EXTRACTION', 'WORKFORCE_PIONEERS', ... or '' when there is no program now.
export function getLiveCogc(naturalId: string) {
  return cogcs.get(naturalId);
}

export function getPlanetFaction(naturalId: string) {
  return factions.get(naturalId);
}

export function requestLiveCogc(naturalIds: string[]) {
  for (const id of naturalIds) {
    if (!requested.has(id)) {
      requested.add(id);
      queue.push(id);
    }
  }
  pump();
}

function pump() {
  while (running < maxRunning && queue.length > 0) {
    const id = queue.shift()!;
    running++;
    void fetchCogc(id).finally(() => {
      running--;
      pump();
    });
  }
}

async function fetchCogc(naturalId: string) {
  try {
    const response = await fetch(`https://rest.fnar.net/planet/${encodeURIComponent(naturalId)}`);
    if (!response.ok) {
      return;
    }
    const planet = (await response.json()) as {
      COGCPrograms?: FioCogcProgram[] | null;
      FactionCode?: string | null;
      FactionName?: string | null;
    };
    factions.set(naturalId, {
      code: planet.FactionCode ?? '',
      name: planet.FactionName ?? '',
    });
    const now = Date.now();
    const current = (planet.COGCPrograms ?? []).find(
      x => x.StartEpochMs <= now && now < x.EndEpochMs,
    );
    cogcs.set(naturalId, (current?.ProgramType ?? '').replace(/^ADVERTISING_/, ''));
  } catch {
    // Keep the snapshot value.
  }
}

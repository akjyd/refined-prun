// Current COGC program of planets, from FIO /planet/{id}. One request per planet, once per session.
// The embedded snapshot is used until the answer arrives or when FIO cannot be reached.

interface FioCogcProgram {
  ProgramType: string | null;
  StartEpochMs: number;
  EndEpochMs: number;
}

const cogcs = shallowReactive(new Map<string, string>());
const requested = new Set<string>();
const queue: string[] = [];
let running = 0;
const maxRunning = 4;

// 'RESOURCE_EXTRACTION', 'WORKFORCE_PIONEERS', ... or '' when there is no program now.
export function getLiveCogc(naturalId: string) {
  return cogcs.get(naturalId);
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
    const planet = (await response.json()) as { COGCPrograms?: FioCogcProgram[] | null };
    const now = Date.now();
    const current = (planet.COGCPrograms ?? []).find(
      x => x.StartEpochMs <= now && now < x.EndEpochMs,
    );
    cogcs.set(naturalId, (current?.ProgramType ?? '').replace(/^ADVERTISING_/, ''));
  } catch {
    // Keep the snapshot value.
  }
}

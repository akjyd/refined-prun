// Player user names by company code, from FIO /company/code/{CODE}. Only companies that FIO
// has data for have one; the others stay null and show the company name. Kept for the session.

export const companyUsers = shallowReactive(new Map<string, string | null>());

const queue: string[] = [];
const asked = new Set<string>();
let running = 0;
const LIMIT = 2;

async function load(code: string) {
  try {
    const response = await fetch(`https://rest.fnar.net/company/code/${encodeURIComponent(code)}`);
    if (response.status !== 200) {
      companyUsers.set(code, null);
      return;
    }
    const data = (await response.json()) as { UserName?: string | null };
    companyUsers.set(code, data.UserName ?? null);
  } catch {
    companyUsers.set(code, null);
  }
}

function next() {
  while (running < LIMIT && queue.length > 0) {
    const code = queue.shift()!;
    running++;
    void load(code).finally(() => {
      running--;
      next();
    });
  }
}

export function requestCompanyUsers(codes: string[]) {
  for (const code of codes) {
    if (typeof code === 'string' && code !== '' && !asked.has(code)) {
      asked.add(code);
      queue.push(code);
    }
  }
  next();
}

// The user name when FIO knows it, else the company name.
export function traderName(trader: { name: string; code: string }) {
  return companyUsers.get(trader.code) ?? trader.name;
}

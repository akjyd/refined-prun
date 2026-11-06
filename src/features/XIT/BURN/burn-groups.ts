import { BurnValues, getMinDaysLeft } from '@src/core/burn';
import { getPlanetFaction, requestLiveCogc } from '@src/infrastructure/fio/planet-info';
import { userData } from '@src/store/user-data';
import { t } from '@src/i18n';

// XIT BURN grouped by faction (player, 2026-11-06). The faction of a planet comes from FIO
// /planet/{id} (FactionCode), which planet-info.ts already asks for to get the COGC program.
// Until FIO answers, or when it cannot be reached, no planet has a faction and the list is
// left as it is. A planet you moved yourself (settings.burn.group) goes where you put it.

// A faction is named after its main exchange station, as everywhere else in this fork.
// Source: FIO /exchange/station (CountryCode -> station NaturalId), 2026-11-06. CI also runs
// ARC and NC also runs HUB; the main station names the faction.
const FACTION_LABELS: Record<string, string> = {
  AI: 'ANT',
  CI: 'BEN',
  IC: 'HRT',
  NC: 'MOR',
};

// Faction colors, picked from the faction emblems the player sent (2026-11-06):
// Insitor #009920, Castillo-Ito #e10909, NEO Charter #f4c626, Antares #fb5318. The dot uses the
// emblem color; the name uses it too, except the two that are too dark to read on the window
// background, which keep their hue at a higher lightness (WCAG 4.6:1 on #1f1f1e).
const FACTION_COLORS: Record<string, { dot: string; text: string }> = {
  ANT: { dot: '#fb5318', text: '#fb5318' },
  BEN: { dot: '#e10909', text: '#f84444' },
  HRT: { dot: '#009920', text: '#009e21' },
  MOR: { dot: '#f4c626', text: '#f4c626' },
};

export interface BurnGroup<T> {
  // Undefined for the group that gets no header: the planets before any faction is known, and
  // the overall section.
  name?: string;
  color?: { dot: string; text: string };
  planets: T[];
}

interface Section {
  naturalId: string;
  burn: BurnValues;
}

// The group a planet is listed under: the one you set, else its faction, else "no faction".
export function groupOf(naturalId: string) {
  const own = userData.settings.burn.group[naturalId];
  if (own !== undefined && own !== '') {
    return own;
  }
  const code = getPlanetFaction(naturalId)?.code ?? '';
  return code === '' ? t('burn.noFaction') : (FACTION_LABELS[code] ?? code);
}

export function groupColor(name: string) {
  return FACTION_COLORS[name];
}

// Every group there is now, for the editor: the factions, the groups you made, and the ones in
// use.
export function allGroups(naturalIds: string[]) {
  const names = [...Object.values(FACTION_LABELS)];
  for (const id of naturalIds) {
    const name = groupOf(id);
    if (!names.includes(name)) {
      names.push(name);
    }
  }
  for (const name of Object.values(userData.settings.burn.group)) {
    if (name !== '' && !names.includes(name)) {
      names.push(name);
    }
  }
  const noFaction = t('burn.noFaction');
  if (!names.includes(noFaction)) {
    names.push(noFaction);
  }
  return names;
}

export function burnGroups<T extends Section>(sections: T[]): BurnGroup<T>[] {
  // The same call order-profit.ts makes: asking again for a planet already asked for does
  // nothing.
  requestLiveCogc(sections.map(x => x.naturalId).filter(x => x !== ''));
  // The overall section has no planet, so it stays at the bottom without a header.
  const overall = sections.filter(x => x.naturalId === '');
  const planets = sections.filter(x => x.naturalId !== '');
  const noFaction = t('burn.noFaction');
  const grouped = planets.some(x => groupOf(x.naturalId) !== noFaction);
  if (!grouped) {
    return [{ planets: sections }];
  }
  const byName = new Map<string, T[]>();
  for (const planet of planets) {
    const name = groupOf(planet.naturalId);
    byName.set(name, [...(byName.get(name) ?? []), planet]);
  }
  // The most urgent group first, as the planets themselves are sorted; the planets outside the
  // factions last.
  const groups = [...byName.entries()]
    .map(([name, list]) => ({
      name,
      color: groupColor(name),
      planets: list,
      days: Math.min(...list.map(x => getMinDaysLeft(x.burn))),
    }))
    .sort((a, b) => {
      if ((a.name === noFaction) !== (b.name === noFaction)) {
        return a.name === noFaction ? 1 : -1;
      }
      return a.days - b.days;
    })
    .map(({ name, color, planets: list }) => ({ name, color, planets: list }));
  return overall.length > 0 ? [...groups, { planets: overall }] : groups;
}

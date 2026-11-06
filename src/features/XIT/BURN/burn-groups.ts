import { BurnValues, getMinDaysLeft } from '@src/core/burn';
import { getPlanetFaction, requestLiveCogc } from '@src/infrastructure/fio/planet-info';
import { t } from '@src/i18n';

// XIT BURN grouped by faction (player, 2026-11-06). The faction of a planet comes from FIO
// /planet/{id} (FactionCode / FactionName), which planet-info.ts already asks for. Until FIO
// answers, or when it cannot be reached, no planet has a faction and the list is left as it is.

export interface BurnGroup<T> {
  // Undefined for the group that gets no header: the planets before any faction is known, and
  // the overall section.
  name?: string;
  planets: T[];
}

interface Section {
  naturalId: string;
  burn: BurnValues;
}

export function burnGroups<T extends Section>(sections: T[]): BurnGroup<T>[] {
  // The same call order-profit.ts uses: asking again for a planet already asked for does
  // nothing.
  requestLiveCogc(sections.map(x => x.naturalId).filter(x => x !== ''));
  // The overall section has no planet, so it stays at the bottom without a header.
  const overall = sections.filter(x => x.naturalId === '');
  const planets = sections.filter(x => x.naturalId !== '');
  const known = planets.filter(x => (getPlanetFaction(x.naturalId)?.code ?? '') !== '');
  if (known.length === 0) {
    return [{ planets: sections }];
  }
  const byName = new Map<string, T[]>();
  for (const planet of planets) {
    const faction = getPlanetFaction(planet.naturalId);
    const name =
      faction !== undefined && faction.code !== ''
        ? faction.name !== ''
          ? faction.name
          : faction.code
        : t('burn.noFaction');
    byName.set(name, [...(byName.get(name) ?? []), planet]);
  }
  // The most urgent group first, as the planets themselves are sorted; planets outside the
  // factions last.
  const noFaction = t('burn.noFaction');
  const groups = [...byName.entries()]
    .map(([name, list]) => ({ name, planets: list, days: Math.min(...list.map(daysOf)) }))
    .sort((a, b) => {
      if ((a.name === noFaction) !== (b.name === noFaction)) {
        return a.name === noFaction ? 1 : -1;
      }
      return a.days - b.days;
    })
    .map(({ name, planets: list }) => ({ name, planets: list }));
  return overall.length > 0 ? [...groups, { planets: overall }] : groups;
}

function daysOf(section: Section) {
  return getMinDaysLeft(section.burn);
}

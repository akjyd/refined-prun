import { createEntityStore } from '@src/infrastructure/prun-api/data/create-entity-store';
import { onApiMessage } from '@src/infrastructure/prun-api/data/api-messages';

interface PlanetSite {
  planetId: string;
  type: string;
  plot: number;
  entity?: { naturalId?: string; _type?: string };
}

// All plots of one planet, sent when the player opens planet tiles such as PLI or POPR.
interface PlanetSites {
  planetId: string;
  // Planet natural ID, known when a planetary project occupies a plot.
  naturalId?: string;
  sites: PlanetSite[];
}

const store = createEntityStore<PlanetSites>({ selectId: x => x.planetId });
const state = store.state;
// The planet whose sites came last; used when a planet's natural ID is unknown.
const lastPlanetId = ref<string>();

onApiMessage({
  DATA_DATA(data: { body: PlanetSite[]; path: string[] }) {
    if (data.path[0] !== 'planets' || data.path[2] !== 'sites' || data.path.length !== 3) {
      return;
    }
    const sites = data.body;
    const naturalId = sites.find(x => x.entity?._type === 'planet')?.entity?.naturalId;
    store.setOne({ planetId: data.path[1], naturalId, sites });
    store.setFetched();
    lastPlanetId.value = data.path[1];
  },
});

function getByNaturalId(naturalId?: string | null) {
  if (!naturalId) {
    return undefined;
  }
  const upper = naturalId.toUpperCase();
  return state.all.value?.find(x => x.naturalId?.toUpperCase() === upper);
}

// Number of player bases on the planet.
function countBases(entry?: PlanetSites) {
  return entry?.sites.filter(x => x.type === 'PLAYER_SITE').length;
}

export const planetSitesStore = {
  ...state,
  lastPlanetId,
  getByNaturalId,
  countBases,
};

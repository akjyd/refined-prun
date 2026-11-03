declare namespace PrunApi {
  interface Population {
    id: string;
    infrastructure: PopulationInfrastructure[];
    // All population reports of the planet, oldest first. Sent when POPR opens.
    reports?: PopulationReport[];
  }

  type PopulationTier = 'PIONEER' | 'SETTLER' | 'TECHNICIAN' | 'ENGINEER' | 'SCIENTIST';
  type PopulationNeed = 'LIFE_SUPPORT' | 'SAFETY' | 'HEALTH' | 'COMFORT' | 'CULTURE' | 'EDUCATION';

  interface PopulationReport {
    time: DateTime;
    simulationPeriod: number;
    explorersGraceEnabled: boolean;
    nextPopulation: Record<PopulationTier, number>;
    populationDifference: Record<PopulationTier, number>;
    averageHappiness: Record<PopulationTier, number>;
    unemploymentRate: Record<PopulationTier, number>;
    openJobs: Record<PopulationTier, number>;
    // Capped at 1.
    needFulfillment: Record<PopulationNeed, number>;
    // Share of each source in a need; the shares of one need add up to 1.
    needFulfillments: {
      infrastructureType: string;
      needType: PopulationNeed;
      fulfillment: number;
    }[];
    governmentProgramType: string | null;
  }

  interface PopulationInfrastructure {
    type: string;
    ticker: string;
    projectId: string;
    projectName: string;
    level: number;
    activeLevel: number;
    currentLevel: number;
    upkeepStatus: number;
    upgradeStatus: number;
  }
}

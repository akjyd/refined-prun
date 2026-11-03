import { describe, expect, it } from 'vitest';
import { parseFioReports } from './population-source';

// Two rows of the FIO population report CSV for SE-648b (columns as FIO sends them).
const csv = `PlanetNaturalId,PlanetName,ExplorersGraceEnabled,SimulationPeriod,TimestampMs,NextPopulationPioneer,NextPopulationSettler,NextPopulationTechnician,NextPopulationEngineer,NextPopulationScientist,PopulationDifferencePioneer,PopulationDifferenceSettler,PopulationDifferenceTechnician,PopulationDifferenceEngineer,PopulationDifferenceScientist,AverageHappinessPioneer,AverageHappinessSettler,AverageHappinessTechnician,AverageHappinessEngineer,AverageHappinessScientist,UnemploymentRatePioneer,UnemploymentRateSettler,UnemploymentRateTechnician,UnemploymentRateEngineer,UnemploymentRateScientist,OpenJobsPioneer,OpenJobsSettler,OpenJobsTechnician,OpenJobsEngineer,OpenJobsScientist,NeedFulfillmentLifeSupport,NeedFulfillmentSafety,NeedFulfillmentHealth,NeedFulfillmentComfort,NeedFulfillmentCulture,NeedFulfillmentEducation
SE-648b,SE-648b,False,269,1792693923372,10923,3321,3455,925,1,-137,-6,13,18,0,0.6890845894813538,0.4300277531147003,0.5018422603607178,0.48476722836494446,0,0.13381555676460266,0.31620079278945923,0.13277164101600647,0.15104740858078003,1,0,0,0,0,0,1,0.5760664343833923,0.5809862017631531,0.5760664343833923,0.5760664343833923,0.5760664343833923
SE-648b,SE-648b,False,268,1792089123372,11060,3327,3442,907,1,-139,-10,6,25,0,0.6988734602928162,0.4265110194683075,0.4965576231479645,0.4946039319038391,0,0.14456647634506226,0.31824991106987,0.13125728070735931,0.1269841343164444,1,0,0,0,0,0,1,0.571780264377594,0.5134434103965759,0.5134434103965759,0.5134434103965759,0.5134434103965759
`;

describe('parseFioReports', () => {
  it('reads FIO population reports, oldest first', () => {
    const reports = parseFioReports(csv);
    expect(reports).toHaveLength(2);
    expect(reports[0].population.PIONEER).toBe(11060);
    expect(reports[1].population.SETTLER).toBe(3321);
    expect(reports[1].fulfillment[1]).toBeCloseTo(0.576, 3);
    expect(reports[1].explorersGrace).toBe(false);
  });
});

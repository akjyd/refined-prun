declare namespace PrunApi {
  interface Cogc {
    id: string;
    planet: AddressEntity;
    status: string;
    upkeep: CogcUpkeep | null;
    // 7-day periods, newest first. The first one is the next period; its type follows the
    // leading vote.
    programs?: CogcProgram[];
    votes?: CogcVote[];
    programTypes?: string[];
  }

  interface CogcProgram {
    type: string | null;
    start: DateTime;
    end: DateTime;
  }

  interface CogcVote {
    voter: { id: string; name: string; code: string };
    influence: number;
    type: string;
    time: DateTime;
  }

  interface CogcUpkeep {
    billOfMaterial: CogcBillEntry[];
    contributions: PopulationProjectContribution[];
    dueDate: DateTime;
  }

  interface CogcBillEntry {
    material: Material;
    amount: number;
    currentAmount: number;
  }
}

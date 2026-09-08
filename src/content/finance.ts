export interface FinanceTier {
  id: 'smallholder' | 'medium' | 'large';
  producer: string;
  turnover: string;
  turnoverMin: number;
  turnoverMax: number | null;
  grantPct: number;
  loanPct: number;
  cap: number;
  capLabel: string;
}

/**
 * The Blended Finance Scheme: a departmental grant matched with concessional
 * Land Bank debt. R3.2 billion, run with the Land and Agricultural Development
 * Bank of South Africa.
 */
export const FINANCE_TIERS: FinanceTier[] = [
  {
    id: 'smallholder',
    producer: 'Smallholder producer',
    turnover: 'R50 000 – R1m',
    turnoverMin: 50_000,
    turnoverMax: 1_000_000,
    grantPct: 70,
    loanPct: 30,
    cap: 500_000,
    capLabel: 'R500 000',
  },
  {
    id: 'medium',
    producer: 'Medium-scale producer',
    turnover: 'R1m – R10m',
    turnoverMin: 1_000_000,
    turnoverMax: 10_000_000,
    grantPct: 50,
    loanPct: 50,
    cap: 1_000_000,
    capLabel: 'R1 000 000',
  },
  {
    id: 'large',
    producer: 'Large commercial producer',
    turnover: 'Above R10m',
    turnoverMin: 10_000_000,
    turnoverMax: null,
    grantPct: 30,
    loanPct: 70,
    cap: 1_500_000,
    capLabel: 'R1 500 000',
  },
];

export const BFS_CRITERIA = [
  'Majority black-owned — at least 60% equity in a joint venture',
  'Producing a priority commodity in the Agriculture and Agro-processing Master Plan',
  'At least 20 out of 50 on the agricultural development scorecard',
  '10% equity or profit-share allocated to farm workers',
];

export interface SupportProgramme {
  name: string;
  abbr?: string;
  runBy: string;
  pays: string;
  detail: string;
}

export const SUPPORT_PROGRAMMES: SupportProgramme[] = [
  {
    name: 'Comprehensive Agricultural Support Programme',
    abbr: 'CASP',
    runBy: 'Department of Agriculture, with provinces',
    pays: 'On-farm infrastructure and mentorship',
    detail:
      'Fencing, handling facilities, boreholes and irrigation equipment, plus input subsidies and technical mentorship through Agri-Parks and Farmer Production Support Units. Runs alongside the Ilima/Letsema conditional grant.',
  },
  {
    name: 'Blended Finance Scheme',
    abbr: 'BFS',
    runBy: 'Department of Agriculture with the Land Bank',
    pays: 'Grant plus concessional debt',
    detail:
      'R3.2 billion facility. The grant share falls and the debt share rises as turnover grows, so the state carries most of the risk for the smallest producers.',
  },
  {
    name: 'Agro Energy Fund',
    abbr: 'AEF',
    runBy: 'Department of Agriculture with the Land Bank',
    pays: 'Energy infrastructure',
    detail:
      'Solar installations, biomass systems and cold-chain capacity, established to keep production going through load-shedding.',
  },
];

/** The reason the grants exist at all. */
export const COLLATERAL_PROBLEM =
  'A state lease cannot be pledged as security. Commercial banks will not lend against a contract the state can terminate on its own assessment of underutilisation, so lessees are cut out of ordinary agricultural credit and depend on these facilities instead.';

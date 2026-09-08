export type CategoryId = 1 | 2 | 3 | 4;

export interface BeneficiaryCategory {
  id: CategoryId;
  name: string;
  profile: string;
  turnover: string;
  tenure: string;
  rental: string;
  purchase: string;
  canBuy: boolean;
  /** What the state expects to provide alongside the land. */
  support: string;
}

/**
 * The four tiers under the Beneficiary Selection and Land Allocation Policy.
 * Which one you land in decides your lease, your rent and whether you can ever own the land.
 */
export const CATEGORIES: BeneficiaryCategory[] = [
  {
    id: 1,
    name: 'Household producer',
    profile:
      'Indigent, child-headed and food-insecure households farming to feed themselves, with negligible marketable surplus.',
    turnover: 'No meaningful sales',
    tenure: 'Caretakership, or a conditional long-term lease',
    rental: 'R1 per year',
    purchase: 'No option to purchase',
    canBuy: false,
    support: 'Household food production support and basic inputs.',
  },
  {
    id: 2,
    name: 'Smallholder',
    profile:
      'Producing for the household and selling a modest surplus into local and informal markets.',
    turnover: 'Roughly R50 000 – R1 000 000',
    tenure: '5 to 30 years, subject to performance review',
    rental: 'R1 per year',
    purchase: 'No option to purchase',
    canBuy: false,
    support: 'Extension services, input assistance, Farmer Production Support Units.',
  },
  {
    id: 3,
    name: 'Medium-scale commercial',
    profile:
      'Real farming experience, dependable commercial returns and own movable assets — held back by access to land and working capital.',
    turnover: 'Roughly R1m – R10m',
    tenure: '30-year lease, renewable for a further 20',
    rental: 'Subsidised — about 2% of the farm’s agricultural value',
    purchase: 'Yes, after sustained productive performance',
    canBuy: true,
    support: 'CASP infrastructure grants and blended finance through the Land Bank.',
  },
  {
    id: 4,
    name: 'Large commercial',
    profile:
      'Fully capitalised agribusiness able to operate in domestic and export value chains without ongoing state operating grants.',
    turnover: 'Above R10m',
    tenure: '30-year lease, renewable for a further 20',
    rental: 'Full commercial market rental, escalated annually',
    purchase: 'Yes, on standard commercial acquisition terms',
    canBuy: true,
    support: 'Blended finance and the Agro Energy Fund; no operating grants.',
  },
];

export const RENTAL_FORMULA = {
  expression: 'annual rent = agricultural value × 2%',
  note: 'The return factor is set against the farm’s productive valuation, not its speculative market price, and is indexed for inflation. Rent is invoiced monthly, and the Land Administration Unit audits state assets on the farm quarterly.',
};

export interface PolicyEra {
  year: string;
  name: string;
  abbr?: string;
  summary: string;
  outcome: string;
}

/** How the state got from grant-assisted purchase to being the landlord. */
export const POLICY_TIMELINE: PolicyEra[] = [
  {
    year: '1996',
    name: 'Section 25 of the Constitution',
    summary:
      'Mandates equitable access to land, legally secure tenure, and restitution for dispossession under colonial and apartheid rule.',
    outcome: 'The constitutional basis for every programme below.',
  },
  {
    year: '1995',
    name: 'Settlement Land Acquisition Grant',
    abbr: 'SLAG',
    summary:
      'Households pooled small capital grants to buy commercial farms from willing sellers.',
    outcome:
      'Pooling produced severe overcrowding on single farms and left no working capital. Largely abandoned.',
  },
  {
    year: '2001',
    name: 'Land Redistribution for Agricultural Development',
    abbr: 'LRAD',
    summary:
      'Replaced pooling with escalating beneficiary equity or loan contributions matched by state subsidy, aimed at building an emerging commercial class.',
    outcome:
      'Still market-led. The 30% redistribution target for 2015 was missed — an estimated 5.5–8% was transferred.',
  },
  {
    year: '2006',
    name: 'Proactive Land Acquisition Strategy',
    abbr: 'PLAS',
    summary:
      'The state stopped funding private purchases and became the buyer itself, acquiring commercially viable farms and keeping the title deeds.',
    outcome:
      'Beneficiaries became lessees rather than owners. This is the mechanism behind almost every farm advertised today.',
  },
  {
    year: '2013',
    name: 'State Land Lease and Disposal Policy',
    abbr: 'SLLDP',
    summary:
      'Standardised lease terms, rental categories and the conditions under which a lessee may eventually buy the land.',
    outcome:
      'Prevents speculative resale and keeps productive assets intact — at the cost of leaving lessees without title to pledge as security.',
  },
  {
    year: '2020',
    name: 'Beneficiary Selection and Land Allocation Policy',
    abbr: 'BSLAP',
    summary:
      'Four beneficiary categories, a scored selection process and a committee chain from district to national level.',
    outcome: 'The rules your application is actually scored against.',
  },
  {
    year: '2024',
    name: 'The department splits in two',
    summary:
      'Under the Government of National Unity, DALRRD became the Department of Land Reform and Rural Development (land rights, acquisition, allocation) and the Department of Agriculture (production, biosecurity, trade, farmer development).',
    outcome:
      'Land comes from one department, the support that makes it productive from the other. An Inter-Ministerial Committee chaired by the Deputy President coordinates the two.',
  },
];

export interface Landmark {
  label: string;
  value: string;
  detail: string;
}

/** The numbers that describe the size of the problem and the response. */
export const NATIONAL_FIGURES: Landmark[] = [
  {
    label: 'South Africa’s surface area',
    value: '121.97m ha',
    detail: 'About 79% is privately held, 14% is registered state land, and roughly 7% is unrecorded or unsurveyed.',
  },
  {
    label: 'Advertised in the October 2020 drive',
    value: '700 000 ha',
    detail:
      '896 state-owned farms across seven provinces on 30-year leases. The Western Cape and Gauteng were excluded — their state agricultural reserves were already fully taken up.',
  },
  {
    label: 'Released in February 2020',
    value: '135 117 ha',
    detail:
      'Allocated to 275 producers across six provinces: 160 women, 114 young people and one person with a disability.',
  },
  {
    label: 'Restitution settled, 1995–Dec 2024',
    value: '3 760 495 ha',
    detail:
      'Benefiting about 2.4 million people in 466 568 households, 180 354 of them female-headed. Over 90% of settled claims took cash rather than land.',
  },
  {
    label: 'Target for 2024–2029',
    value: '200 000 ha',
    detail: 'The medium-term allocation target for expanding access and improving tenure security.',
  },
];

/** Land that arrived from other departments rather than open-market purchase. */
export const TRANSFERS = [
  {
    from: 'Public Works and Infrastructure',
    since: '2019',
    parcels: 125,
    hectares: 25549,
    note: 'Transferred for agricultural redistribution.',
  },
  {
    from: 'Human Settlements',
    since: '2019',
    parcels: 44,
    hectares: 2424,
    note: 'Released for peri-urban farming and smallholder settlement.',
  },
];

export interface Risk {
  id: string;
  title: string;
  what: string;
  soWhat: string;
}

/** What goes wrong on state land, stated plainly. */
export const RISKS: Risk[] = [
  {
    id: 'tenure',
    title: 'The state stays the landlord',
    what: 'PLAS keeps the title deed in the national register. Leases carry termination clauses triggered by a departmental assessment of underutilisation.',
    soWhat:
      'Banks will not accept the lease as security, so ordinary production credit is closed to you. Budget for state grants and development finance, not an overdraft.',
  },
  {
    id: 'contracts',
    title: 'Many farmers hold no signed long-term contract',
    what: 'Administrative backlogs at provincial centres leave occupiers on interim caretaker agreements or verbal assurances.',
    soWhat:
      'Do not put private money into soil conditioning, fencing or borehole work before your lease is signed and lodged. Get the contract in writing and keep a copy.',
  },
  {
    id: 'capture',
    title: 'Selection has been captured before',
    what: 'Earlier rounds lacked an open points-based adjudication, and well-resourced or connected applicants secured prime farms ahead of farm workers, labour tenants and resource-poor smallholders.',
    soWhat:
      'Scores and rankings are recorded. If you are unsuccessful, you are entitled to written reasons and a review by the Land Allocation Appeals Committee.',
  },
  {
    id: 'groups',
    title: 'Collective farming keeps failing on governance',
    what: 'Communal Property Associations and co-operatives split into factions, argue over dividends against operating reserves, and carry uneven labour contributions — leading to deferred maintenance and asset stripping.',
    soWhat:
      'Where a group structure is unavoidable, push for individual production plots on shared infrastructure. That is what turned Tswelopele around.',
  },
  {
    id: 'split',
    title: 'Land and support now come from two departments',
    what: 'Since 2024, land allocation sits with DLRRD and production support with the Department of Agriculture.',
    soWhat:
      'Getting the farm does not get you the CASP grant or the extension officer. Open both files at once and do not assume one department has told the other.',
  },
];

export interface CaseStudy {
  id: string;
  name: string;
  place: string;
  province: string;
  scale: string;
  model: string;
  what: string;
  lesson: string;
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'tswelopele',
    name: 'Tswelopele Irrigation Scheme',
    place: 'Praktiseer 275 KT, Sekhukhune District',
    province: 'LP',
    scale: '470 ha · 49 producers',
    model: '30-year SLLDP lease, individual plots on shared infrastructure',
    what: 'Production had collapsed under a co-operative structure riven by internal conflict. The department restructured the scheme so each of the 49 members carries individual responsibility for a designated plot while the bulk irrigation infrastructure stays shared.',
    lesson:
      'Separating individual responsibility from shared capital restored commercial potato, maize and cotton production. Group farming fails on governance far more often than on agronomy.',
  },
  {
    id: 'taung',
    name: 'Taung Goat Massification Programme',
    place: 'Dr Ruth Segomotsi Mompati District',
    province: 'NW',
    scale: 'Smallholder and communal lessees',
    model: 'Breeding stock and inputs through Farmer Production Support Units',
    what: 'Producers receive high-quality breeding bucks, veterinary packages, supplementary feed and handling kraals, with breeding and management standards formalised.',
    lesson:
      'Standardised breeding and handling is what moves small-stock farmers from subsistence rangeland grazing into formal regional auctions.',
  },
  {
    id: 'one-household',
    name: 'One Household, One Hectare',
    place: 'Aloekop, Kokstad',
    province: 'KZN',
    scale: 'R100m initial allocation',
    model: 'Acquired farms subdivided into one-hectare plots with shared grazing',
    what: 'Beneficiaries hold individual food-production plots alongside communal grazing, and form primary co-operatives linked to local processing and distribution hubs. Green maize, dry beans and homestead vegetables go to household use and municipal markets.',
    lesson:
      'Equity at household scale is achievable, but relocation costs and infrastructure gaps remain the binding constraints.',
  },
];

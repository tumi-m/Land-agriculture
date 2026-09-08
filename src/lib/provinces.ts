import type { Enterprise, ListingStatus, ProvinceCode, Tenure } from './types';

export interface ProvinceMeta {
  code: ProvinceCode;
  name: string;
  capital: string;
  /** Provincial department that administers agricultural support and land allocation. */
  department: string;
  /** Anchor label used on the map at low zoom. */
  short: string;
}

export const PROVINCES: Record<ProvinceCode, ProvinceMeta> = {
  EC: {
    code: 'EC',
    name: 'Eastern Cape',
    capital: 'Bhisho',
    department: 'Department of Rural Development and Agrarian Reform',
    short: 'E. Cape',
  },
  FS: {
    code: 'FS',
    name: 'Free State',
    capital: 'Bloemfontein',
    department: 'Department of Agriculture and Rural Development',
    short: 'Free State',
  },
  GP: {
    code: 'GP',
    name: 'Gauteng',
    capital: 'Johannesburg',
    department: 'Department of Agriculture and Rural Development',
    short: 'Gauteng',
  },
  KZN: {
    code: 'KZN',
    name: 'KwaZulu-Natal',
    capital: 'Pietermaritzburg',
    department: 'Department of Agriculture and Rural Development',
    short: 'KZN',
  },
  LP: {
    code: 'LP',
    name: 'Limpopo',
    capital: 'Polokwane',
    department: 'Limpopo Department of Agriculture and Rural Development',
    short: 'Limpopo',
  },
  MP: {
    code: 'MP',
    name: 'Mpumalanga',
    capital: 'Mbombela',
    department: 'Department of Agriculture, Rural Development, Land and Environmental Affairs',
    short: 'Mpumalanga',
  },
  NC: {
    code: 'NC',
    name: 'Northern Cape',
    capital: 'Kimberley',
    department: 'Department of Agriculture, Environmental Affairs, Rural Development and Land Reform',
    short: 'N. Cape',
  },
  NW: {
    code: 'NW',
    name: 'North West',
    capital: 'Mahikeng',
    department: 'Department of Agriculture and Rural Development',
    short: 'North West',
  },
  WC: {
    code: 'WC',
    name: 'Western Cape',
    capital: 'Cape Town',
    department: 'Western Cape Department of Agriculture',
    short: 'W. Cape',
  },
};

export const PROVINCE_ORDER: ProvinceCode[] = ['EC', 'FS', 'GP', 'KZN', 'LP', 'MP', 'NC', 'NW', 'WC'];

export const ENTERPRISE_LABELS: Record<Enterprise, string> = {
  poultry: 'Poultry',
  livestock: 'Livestock',
  grain: 'Grain',
  horticulture: 'Horticulture',
  aquaculture: 'Aquaculture',
  piggery: 'Piggery',
  dairy: 'Dairy',
  forestry: 'Forestry',
};

export const STATUS_LABELS: Record<ListingStatus, string> = {
  open: 'Open for applications',
  'closing-soon': 'Closing soon',
  assessment: 'Under assessment',
  allocated: 'Allocated',
};

export const TENURE_LABELS: Record<Tenure, string> = {
  'lease-30yr': '30-year lease',
  'lease-10yr': '10-year lease',
  caretaker: 'Caretaker agreement',
  grant: 'Title deed grant',
};

/** Single national entry point. Provincial offices are reached through it. */
export const NATIONAL_PORTAL = {
  name: 'Department of Agriculture, Land Reform and Rural Development',
  abbr: 'DALRRD',
  url: 'https://www.dalrrd.gov.za/',
};

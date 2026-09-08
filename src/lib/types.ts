export type ProvinceCode = 'EC' | 'FS' | 'GP' | 'KZN' | 'LP' | 'MP' | 'NC' | 'NW' | 'WC';

export type Enterprise =
  | 'poultry'
  | 'livestock'
  | 'grain'
  | 'horticulture'
  | 'aquaculture'
  | 'piggery'
  | 'dairy'
  | 'forestry';

export type ListingStatus = 'open' | 'closing-soon' | 'assessment' | 'allocated';

export type Tenure = 'lease-30yr' | 'caretaker' | 'lease-10yr' | 'grant';

export interface ApplicationStep {
  title: string;
  detail: string;
  documents?: string[];
}

export interface Contact {
  office: string;
  person: string;
  role: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
}

export interface ListingImage {
  /** Absolute or root-relative URL. When absent the viewer draws a generated plan illustration. */
  src?: string;
  alt: string;
  caption: string;
  /** Illustration style used when `src` is absent. */
  variant?: 'contour' | 'strips' | 'water' | 'sheds' | 'aerial';
}

export interface Listing {
  id: string;
  reference: string;
  title: string;
  province: ProvinceCode;
  district: string;
  municipality: string;
  /** [longitude, latitude] */
  coordinates: [number, number];
  sizeHa: number;
  arableHa: number;
  tenure: Tenure;
  enterprises: Enterprise[];
  status: ListingStatus;
  opensOn: string;
  closesOn: string;
  summary: string;
  water: string;
  soil: string;
  rainfallMm: number;
  infrastructure: string[];
  eligibility: string[];
  applicationSteps: ApplicationStep[];
  contact: Contact;
  documents: { label: string; url: string }[];
  images: ListingImage[];
  updatedAt: string;
  /** False until a listing has been checked against the issuing office's own publication. */
  verified: boolean;
  sourceUrl?: string;
}

export interface Dataset {
  /** Bumped by the publisher on every change; drives the live-update indicator. */
  revision: string;
  updatedAt: string;
  /** Where the running app read this from. */
  source: 'seed' | 'remote';
  /** Set when a remote source was configured but could not be read. */
  sourceError?: string;
  listings: Listing[];
}

import type { ProvinceCode } from '@/lib/types';

export interface Official {
  name: string;
  role: string;
  phone?: string;
  email?: string;
}

export interface Pssc {
  /** Physical address of the Provincial Shared Service Centre. */
  address: string;
  postal: string;
  phones: string[];
  officials: Official[];
}

export interface ProvinceRecord {
  code: ProvinceCode;
  name: string;
  short: string;
  capital: string;
  /** Registered surface area that is state land, where published. */
  stateLandSharePct: number | null;
  /** Hectares advertised in the October 2020 tranche of 896 farms. */
  advertised2020: number;
  /** Hectares released in the February 2020 allocation to 275 producers. */
  released2020: number | null;
  /** Set where the province took part in the February round through regular tranches. */
  releasedNote?: string;
  commodities: string[];
  systems: string;
  pssc: Pssc;
}

export const PROVINCE_ORDER: ProvinceCode[] = ['EC', 'FS', 'GP', 'KZN', 'LP', 'MP', 'NC', 'NW', 'WC'];

export const PROVINCES: Record<ProvinceCode, ProvinceRecord> = {
  NW: {
    code: 'NW',
    name: 'North West',
    short: 'North West',
    capital: 'Mahikeng',
    stateLandSharePct: 23,
    advertised2020: 300000,
    released2020: 46097,
    commodities: ['Beef cattle', 'Goats', 'Maize', 'Sunflower', 'Broilers'],
    systems: 'Extensive beef and goat breeding on savannah rangeland, with maize and sunflower on the eastern cropping belt and contract broiler units near the metros.',
    pssc: {
      address: 'Mega City Complex, West Gallery, cnr Dr James Moroka & Sekame Road, Mmabatho 2735',
      postal: 'Private Bag X74, Mmabatho 2735',
      phones: ['(018) 388 7000'],
      officials: [
        { name: 'Gopolang Kgosiemang', role: 'Enterprise development', phone: '018 391 9699', email: 'Gopolang.Kgosiemang@dalrrd.gov.za' },
        { name: 'Thabang Mache', role: 'Enterprise development', phone: '018 388 7097', email: 'Thabang.Mache@dalrrd.gov.za' },
        { name: 'Ntombi Lumka', role: 'Leasehold management', phone: '018 388 7197', email: 'ntombizodwa.lumka@dalrrd.gov.za' },
        { name: 'Xoliswa Job', role: 'Leasehold management', email: 'XoliswaJ@dalrrd.gov.za' },
      ],
    },
  },
  LP: {
    code: 'LP',
    name: 'Limpopo',
    short: 'Limpopo',
    capital: 'Polokwane',
    stateLandSharePct: 20,
    advertised2020: 121567,
    released2020: 32170,
    commodities: ['Citrus', 'Mango', 'Avocado', 'Potatoes', 'Cotton', 'Vegetables'],
    systems: 'Subtropical and citrus horticulture in the Vhembe and Mopani lowveld, commercial potatoes and cotton under irrigation, and mixed cropping on the Waterberg plateau.',
    pssc: {
      address: '61 Biccard Street, Polokwane 0700',
      postal: 'Private Bag X9312, Polokwane 0700',
      phones: ['(015) 495 1955', '(015) 284 6300'],
      officials: [
        { name: 'D.T. Machoga', role: 'Administrative enquiries and submissions', email: 'Post70@dlrrd.gov.za' },
      ],
    },
  },
  MP: {
    code: 'MP',
    name: 'Mpumalanga',
    short: 'Mpumalanga',
    capital: 'Mbombela',
    stateLandSharePct: 25,
    advertised2020: 40206,
    released2020: 50480,
    commodities: ['Maize', 'Soybeans', 'Dry beans', 'Sugar cane', 'Forestry', 'Red meat'],
    systems: 'Summer grain and oilseed on the highveld, sugar cane and subtropical fruit in the lowveld, and commercial forestry along the escarpment.',
    pssc: {
      address: '17 Van Rensburg Street, Block E, 6th Floor, Bateleur Building, Mbombela 1200',
      postal: 'Private Bag X11305, Nelspruit 1200',
      phones: ['(013) 754 8000', '(013) 756 6000'],
      officials: [
        { name: 'P. Mawela', role: 'Technical operations', phone: '013 756 6069', email: 'Pafrey.Mawela@dlrrd.gov.za' },
        { name: 'Brighton Shumba', role: 'Technical operations', phone: '013 754 2064', email: 'BrightonS@dalrrd.gov.za' },
        { name: 'Banele Ramanyimi', role: 'Acquisition and disposals', phone: '013 754 8066', email: 'banele.ramanyimi@dlrrd.gov.za' },
        { name: 'Kabelo Matsane', role: 'Acquisition and disposals', email: 'Kabelo.Matsane@dalrrd.gov.za' },
      ],
    },
  },
  EC: {
    code: 'EC',
    name: 'Eastern Cape',
    short: 'E. Cape',
    capital: 'Bhisho',
    stateLandSharePct: 9,
    advertised2020: 43000,
    released2020: null,
    releasedNote: 'Took part through regular tranches rather than the February 2020 batch.',
    commodities: ['Deciduous fruit', 'Export citrus', 'Dairy', 'Wool and mutton', 'Chicory'],
    systems: 'Dairy and livestock across the former homeland districts, export citrus in the Sundays River valley, and deciduous fruit and chicory in the south.',
    pssc: {
      address: 'Ocean Terrace, 15 cnr Moore & Coutts Streets, Quigney, East London 5201',
      postal: 'P.O. Box 1716, East London 5201',
      phones: ['(043) 701 8100'],
      officials: [
        { name: 'A. Joubert', role: 'Technical assessment', phone: '043 701 8169' },
        { name: 'P. Chain', role: 'Technical assessment', phone: '043 700 7034' },
        { name: 'L. Zenani', role: 'Administration and bids', phone: '043 701 8155' },
        { name: 'V. Gazi', role: 'Administration and bids', phone: '043 701 8182' },
      ],
    },
  },
  NC: {
    code: 'NC',
    name: 'Northern Cape',
    short: 'N. Cape',
    capital: 'Kimberley',
    stateLandSharePct: 5,
    advertised2020: 12224,
    released2020: null,
    releasedNote:
      'Took part through regular tranches rather than the February 2020 batch. About 94% of the province is privately held commercial land and roughly 1% is unaccounted or unsurveyed, so the state reserve here is small — do not plan around a large pipeline.',
    commodities: [
      'Dorper and Merino sheep',
      'Karakul',
      'Beef rangeland',
      'Table grapes',
      'Raisins',
      'Pecans',
    ],
    systems:
      'Two different farming economies. Extensive small-stock and beef rangeland across the arid Karoo and Kalahari, where carrying capacity — not hectares — is the binding constraint. Then, under irrigation along the Orange and Vaal, high-value export horticulture: table grapes, raisins and pecan orchards. A business plan written for one will not survive assessment for the other.',
    pssc: {
      address: 'Magistrate Court Building, 6th Floor, cnr Knight & Stead Streets, Kimberley 8301',
      postal: 'Private Bag X5007, Kimberley 8300',
      phones: ['(053) 830 4000'],
      officials: [
        { name: 'Janco du Plessis', role: 'Technical and spatial services', phone: '072 734 8146', email: 'Janco.Duplessis@dalrrd.gov.za' },
        { name: 'Sandy Mufamadi', role: 'Technical and spatial services', email: 'Sandy.Mufamadi@dalrrd.gov.za' },
        { name: 'Tshegofatso Chubane', role: 'Allocation support', email: 'Tshegofatso.Chubane@dalrrd.gov.za' },
        { name: 'Central enquiries', role: 'General intake', email: 'Post69@dlrrd.gov.za' },
      ],
    },
  },
  FS: {
    code: 'FS',
    name: 'Free State',
    short: 'Free State',
    capital: 'Bloemfontein',
    stateLandSharePct: 7,
    advertised2020: 8333,
    released2020: 501,
    commodities: ['Maize', 'Sorghum', 'Winter wheat', 'Sunflower', 'Cattle', 'Sheep'],
    systems: 'Summer grain and oilseed across the central plateau, irrigated winter wheat along the rivers, and mixed cattle and sheep on the eastern grassland.',
    pssc: {
      address: '136 SA Eagle Building, Charlotte Maxeke Street, Bloemfontein 9300',
      postal: 'Private Bag X20803, Bloemfontein 9300',
      phones: ['(051) 400 4200'],
      officials: [
        { name: 'André Erasmus', role: 'Technical evaluation', phone: '071 676 9416', email: 'andre.erasmus@dalrrd.gov.za' },
        { name: 'Maipato Nkomo', role: 'Technical evaluation', email: 'Maipato.Sakhele2@dalrrd.gov.za' },
        { name: 'Gladman G. Matshe', role: 'Supply chain and disposals', email: 'gladman.matshe@dlrrd.gov.za' },
        { name: 'Calvin Mampa', role: 'Supply chain and disposals', email: 'Calvin.Mampa@dalrrd.gov.za' },
      ],
    },
  },
  KZN: {
    code: 'KZN',
    name: 'KwaZulu-Natal',
    short: 'KZN',
    capital: 'Pietermaritzburg',
    stateLandSharePct: 50,
    advertised2020: 3684,
    released2020: 4940,
    commodities: ['Sugar cane', 'Timber', 'Poultry', 'Dairy', 'Subtropical fruit'],
    systems: 'Half the province’s registered surface is state land. Sugar cane and timber dominate the coastal belt and midlands, with intensive poultry and dairy inland.',
    pssc: {
      address: '270 Jabu Ndlovu Street, Pietermaritzburg 3201',
      postal: 'Private Bag X9132, Pietermaritzburg 3200',
      phones: ['(033) 264 9500', '(033) 355 4300'],
      officials: [
        { name: 'Yugan Gounder', role: 'Technical enquiries', phone: '033 264 9546' },
        { name: 'Sandile Zondi', role: 'Technical enquiries', phone: '033 355 4300', email: 'sandile.zondi@dlrrd.gov.za' },
        { name: 'Bongani Magudulela', role: 'Leasehold and acquisition', email: 'bongani.magudulela@dlrrd.gov.za' },
        { name: 'Thokozile Dlungwana', role: 'Leasehold and acquisition', email: 'thokozile.dlungwana@dlrrd.gov.za' },
      ],
    },
  },
  GP: {
    code: 'GP',
    name: 'Gauteng',
    short: 'Gauteng',
    capital: 'Johannesburg',
    stateLandSharePct: null,
    advertised2020: 0,
    released2020: 929,
    commodities: ['Broilers and layers', 'Piggery', 'Greenhouse horticulture'],
    systems: 'Peri-urban intensive production close to the country’s biggest market. Excluded from the October 2020 tranche — the state agricultural reserve here was already fully taken up.',
    pssc: {
      address: 'Suncardia Shopping Centre, 6th & 9th Floors, 524 cnr Stanza Bopape & Steve Biko Streets, Arcadia, Pretoria 0028',
      postal: 'Private Bag X9, Hatfield 0028',
      phones: ['(012) 337 3600', '(012) 337 3700'],
      officials: [
        { name: 'Nokwanda Ncoko', role: 'Technical enquiries', phone: '012 337 3686', email: 'nokwanda.ncoko@dlrrd.gov.za' },
        { name: 'Samuel Osei', role: 'Technical enquiries', phone: '012 337 3712', email: 'Samuel.Osei@dlrrd.gov.za' },
        { name: 'Jane Mpepele', role: 'Disposal and supply chain', phone: '012 337 3700', email: 'jane.mpepele@dalrrd.gov.za' },
        { name: 'Esther Ramatseba', role: 'Disposal and supply chain', phone: '060 886 1507', email: 'esther.ramatseba@dlrrd.gov.za' },
      ],
    },
  },
  WC: {
    code: 'WC',
    name: 'Western Cape',
    short: 'W. Cape',
    capital: 'Cape Town',
    stateLandSharePct: 8,
    advertised2020: 0,
    released2020: null,
    releasedNote: 'Took part through regular tranches rather than the February 2020 batch.',
    commodities: ['Wine grapes', 'Pome and stone fruit', 'Winter wheat', 'Swine'],
    systems: 'Viticulture and export deciduous fruit in the winter-rainfall valleys, dryland wheat on the Swartland, and commercial swine near the metro. Excluded from the October 2020 tranche — its state agricultural reserve was already constrained.',
    pssc: {
      address: 'ABSA Building, 4th Floor, 2 Riebeek Street, Foreshore, Cape Town 8000',
      postal: 'Private Bag X9159, Cape Town 8000',
      phones: ['(021) 409 0500', '(021) 409 0526'],
      officials: [
        { name: 'Boniswa Mkhize', role: 'Technical enquiries', phone: '062 466 2235', email: 'Boniswa.Mkhize@dlrrd.gov.za' },
        { name: 'Steve Lazaro', role: 'Technical enquiries', email: 'Steven.lazaro@dalrrd.gov.za' },
        { name: 'Mzubanzi Owen Piri Mntumni', role: 'Disposal operations', phone: '079 529 4065', email: 'mzubanzi.mntumni@dlrrd.gov.za' },
        { name: 'Sicelo Zwane', role: 'Disposal operations' },
      ],
    },
  },
};

export const ADVERTISED_TOTAL_PUBLISHED = 700000;
export const ADVERTISED_FARMS = 896;

/** The provincial breakdown does not add up to the headline figure; say so rather than hide it. */
export const ADVERTISED_ACCOUNTED = PROVINCE_ORDER.reduce(
  (sum, code) => sum + PROVINCES[code].advertised2020,
  0,
);

export const RELEASED_TOTAL = 135117;
export const RELEASED_PRODUCERS = 275;
export const RELEASED_SPLIT = { women: 160, youth: 114, disability: 1 };

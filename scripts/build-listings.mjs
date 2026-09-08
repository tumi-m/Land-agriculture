/**
 * Generates the seed dataset shipped with the app.
 *
 * Every record is illustrative: geography (province, district, coordinates,
 * rainfall band) is real, the parcel itself and its contact block are samples
 * carrying `verified: false`. Replace by pointing LAND_DATA_URL at a real feed.
 */
import fs from 'node:fs';
import { geoContains } from 'd3-geo';
import { feature } from 'topojson-client';

const topo = JSON.parse(fs.readFileSync(new URL('../src/data/sa-districts.topo.json', import.meta.url), 'utf8'));
const districts = feature(topo, topo.objects.districts).features;

const ANCHORS = [
  // [province, district name, place, lng, lat, rainfall mm/yr band midpoint]
  ['EC', 'OR Tambo District', 'Mthatha', 28.784, -31.589, 720],
  ['EC', 'Chris Hani District', 'Komani', 26.875, -31.897, 480],
  ['EC', 'Sarah Baartman District', 'Humansdorp', 24.771, -34.031, 610],
  ['FS', 'Thabo Mofutsanyana District', 'Bethlehem', 28.310, -28.230, 680],
  ['FS', 'Mangaung Metro', 'Bloemfontein', 26.159, -29.085, 560],
  ['FS', 'Fezile Dabi District', 'Kroonstad', 27.234, -27.650, 590],
  ['GP', 'City of Tshwane', 'Bronkhorstspruit', 28.741, -25.810, 660],
  ['GP', 'Sedibeng District', 'Vereeniging', 27.930, -26.673, 640],
  ['GP', 'West Rand District', 'Randfontein', 27.702, -26.184, 650],
  ['KZN', 'Zululand District', 'Vryheid', 30.791, -27.770, 780],
  ['KZN', 'Harry Gwala District', 'Ixopo', 30.061, -30.153, 880],
  ['KZN', 'uMkhanyakude District', 'Jozini', 32.061, -27.430, 700],
  ['LP', 'Waterberg District', 'Modimolle', 28.408, -24.700, 590],
  ['LP', 'Vhembe District', 'Thohoyandou', 30.484, -22.951, 800],
  ['LP', 'Mopani District', 'Tzaneen', 30.163, -23.833, 850],
  ['MP', 'Gert Sibande District', 'Ermelo', 29.980, -26.531, 720],
  ['MP', 'Ehlanzeni District', 'Mbombela', 30.970, -25.474, 780],
  ['MP', 'Nkangala District', 'Middelburg', 29.464, -25.775, 640],
  ['NC', 'Pixley ka Seme District', 'Douglas', 23.771, -29.058, 300],
  ['NC', 'ZF Mgcawu District', 'Upington', 21.246, -28.448, 190],
  ['NC', 'John Taolo Gaetsewe District', 'Kuruman', 23.432, -27.452, 400],
  ['NW', 'Ngaka Modiri Molema District', 'Lichtenburg', 26.159, -26.148, 540],
  ['NW', 'Bojanala Platinum District', 'Rustenburg', 27.242, -25.667, 620],
  ['NW', 'Dr Ruth Segomotsi Mompati District', 'Vryburg', 24.728, -26.953, 450],
  ['WC', 'West Coast District', 'Malmesbury', 18.727, -33.462, 440],
  ['WC', 'Garden Route District', 'Oudtshoorn', 22.201, -33.596, 250],
  ['WC', 'Cape Winelands District', 'Robertson', 19.885, -33.803, 300],
];

const PROFILES = [
  {
    key: 'poultry',
    enterprises: ['poultry', 'grain'],
    title: (p) => `${p} broiler and feed-grain holding`,
    summary: (p, d) =>
      `State-owned holding outside ${p} released for contract broiler production with a maize block for on-farm feed. Sheds are structurally sound but need re-fitting before the first cycle.`,
    infrastructure: [
      '4 × broiler houses (12 000 bird capacity total)',
      'Three-phase electricity connection',
      'Borehole equipped with submersible pump',
      '250 m² feed store and packhouse',
      'Graded internal access road',
    ],
    tenure: 'lease-30yr',
    size: [42, 180],
    arableShare: 0.55,
    soil: 'Hutton and Avalon sandy loam, effective depth 800–1 200 mm',
    water: 'Borehole yield 3.2 l/s, registered for 18 000 m³/yr',
    images: ['sheds', 'aerial', 'water'],
  },
  {
    key: 'livestock',
    enterprises: ['livestock', 'poultry'],
    title: (p) => `${p} communal grazing and layer unit`,
    summary: (p) =>
      `Mixed grazing camps near ${p} with an existing layer unit, released for a producer group. Carrying capacity is set by the provincial veld assessment and reviewed every three years.`,
    infrastructure: [
      '6 fenced grazing camps with rotational gates',
      'Handling facility with crush and loading ramp',
      'Two earth dams and four drinking troughs',
      'Layer house, 3 000 bird capacity',
      'Caretaker dwelling',
    ],
    tenure: 'lease-30yr',
    size: [320, 1400],
    arableShare: 0.12,
    soil: 'Shallow Glenrosa over weathered shale, suited to grazing rather than tillage',
    water: 'Two earth dams plus a seasonal stream; stock watering rights only',
    images: ['contour', 'aerial', 'water'],
  },
  {
    key: 'horticulture',
    enterprises: ['horticulture', 'aquaculture'],
    title: (p) => `${p} irrigated vegetable scheme`,
    summary: (p) =>
      `Irrigated block on a revitalised government scheme near ${p}. Allocation is per-plot; applicants may apply for one plot only and must farm it themselves.`,
    infrastructure: [
      'Centre pivot, 28 ha under irrigation',
      'Pump station and 2 km buried mainline',
      'Shade-net nursery, 1 200 m²',
      'Cold room, 40 m³',
      'Perimeter security fencing',
    ],
    tenure: 'lease-10yr',
    size: [18, 96],
    arableShare: 0.82,
    soil: 'Alluvial Oakleaf, high water-holding capacity, pH 6.1–6.8',
    water: 'Scheme allocation of 6 000 m³/ha/yr from the district water user association',
    images: ['strips', 'water', 'aerial'],
  },
  {
    key: 'grain',
    enterprises: ['grain', 'livestock'],
    title: (p) => `${p} dryland cropping unit`,
    summary: (p) =>
      `Dryland arable land near ${p} released on a caretaker agreement that converts to a long lease once two production seasons are completed to plan.`,
    infrastructure: [
      'Two steel silos, 300 t combined',
      'Implement shed and workshop',
      'Boundary fencing (partial repair needed)',
      'Farm dwelling, 3 bedrooms',
    ],
    tenure: 'caretaker',
    size: [140, 620],
    arableShare: 0.74,
    soil: 'Red Hutton, clay 18–25%, suited to maize and sunflower rotation',
    water: 'Rain-fed; one borehole for domestic and stock use',
    images: ['strips', 'contour', 'aerial'],
  },
  {
    key: 'piggery',
    enterprises: ['piggery', 'poultry', 'grain'],
    title: (p) => `${p} piggery and mixed farming portion`,
    summary: (p) =>
      `Portion of a state farm near ${p} with a decommissioned piggery, offered with a rehabilitation allowance conditional on an approved biosecurity plan.`,
    infrastructure: [
      'Piggery: 80 sow places, needs refurbishment',
      'Effluent dam and irrigation of pastures',
      'Feed mill, 1 t/h',
      'Eskom connection, 100 kVA',
    ],
    tenure: 'lease-30yr',
    size: [60, 240],
    arableShare: 0.45,
    soil: 'Clovelly loam over ferricrete, moderate drainage',
    water: 'Two boreholes, combined yield 4.5 l/s',
    images: ['sheds', 'contour', 'aerial'],
  },
  {
    key: 'dairy',
    enterprises: ['dairy', 'livestock'],
    title: (p) => `${p} pasture and dairy platform`,
    summary: (p) =>
      `Established kikuyu-ryegrass platform near ${p}, released with the milking parlour intact. Preference is given to applicants with verifiable dairy experience.`,
    infrastructure: [
      '12-point swing-over parlour',
      'Bulk tank, 5 000 l',
      'Irrigated pasture, 46 ha',
      'Calf-rearing sheds',
      'Standby generator',
    ],
    tenure: 'lease-30yr',
    size: [90, 320],
    arableShare: 0.6,
    soil: 'Deep Hutton with good structure; established perennial pasture',
    water: 'Registered abstraction from a perennial river, 240 000 m³/yr',
    images: ['strips', 'sheds', 'water'],
  },
];

const STATUSES = ['open', 'open', 'closing-soon', 'assessment', 'open', 'allocated'];

const ELIGIBILITY = [
  'South African citizen, 18 years or older, with a valid green barcoded ID or smart card',
  'Not the registered owner of agricultural land larger than the parcel applied for',
  'Able to show farming experience, a relevant qualification, or a mentorship agreement',
  'One application per household; joint applications must be a registered legal entity',
  'Tax compliant, or registered for a compliance arrangement with SARS',
];

const DOCS = [
  { label: 'Application form and annexures (PDF)', url: 'https://www.dalrrd.gov.za/' },
  { label: 'Beneficiary selection and land allocation policy', url: 'https://www.dalrrd.gov.za/' },
  { label: 'Parcel information sheet and locality plan', url: 'https://www.dalrrd.gov.za/' },
];

function steps(place, district) {
  return [
    {
      title: 'Register an expression of interest',
      detail: `Submit the expression of interest form to the ${district} office, in person or by email, quoting the parcel reference. Late submissions are not carried over to the next round.`,
      documents: ['Certified copy of ID', 'Proof of residential address', 'Completed EOI form'],
    },
    {
      title: 'Compliance screening',
      detail:
        'The office checks citizenship, existing land holdings and tax status. Applicants who fail screening are notified in writing with the reason and may resubmit in the next round.',
    },
    {
      title: 'Submit a production plan',
      detail: `Shortlisted applicants prepare a five-year production plan for the enterprise mix listed above. District extension officers in ${place} run free planning clinics during the application window.`,
      documents: ['Five-year production plan', 'Cash-flow projection', 'Proof of own contribution'],
    },
    {
      title: 'District assessment panel',
      detail:
        'The panel scores each shortlisted applicant on experience, plan quality, own contribution and whether the enterprise suits the parcel. Scores and the ranking are recorded.',
    },
    {
      title: 'Provincial allocation and lease signing',
      detail:
        'The provincial allocation committee confirms the ranked recommendation and issues the lease. Occupation follows a joint site handover and a signed asset register.',
      documents: ['Signed lease agreement', 'Asset register', 'Handover certificate'],
    },
  ];
}

const IMAGE_CAPTIONS = {
  contour: 'Contour and slope sketch from the parcel information sheet',
  strips: 'Cultivated block layout as surveyed',
  water: 'Water infrastructure: boreholes, dams and pipelines',
  sheds: 'Existing production buildings and their condition',
  aerial: 'Parcel boundary over the district locality plan',
};

const pad = (n, w = 3) => String(n).padStart(w, '0');
const round = (n, step) => Math.round(n / step) * step;

// Deterministic pseudo-random so rebuilds do not churn the file.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const BASE = Date.UTC(2026, 8, 1); // dataset epoch: 1 September 2026
const day = 86_400_000;

const listings = ANCHORS.map(([province, districtName, place, lng, lat, rainfall], i) => {
  const rand = rng(i * 7919 + 13);
  const profile = PROFILES[i % PROFILES.length];
  const status = STATUSES[i % STATUSES.length];
  const [minHa, maxHa] = profile.size;
  const sizeHa = round(minHa + rand() * (maxHa - minHa), 2);
  const arableHa = round(sizeHa * profile.arableShare, 1);
  const districtId = districtName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const opensOn = new Date(BASE + Math.floor(rand() * 20) * day).toISOString().slice(0, 10);
  const window = status === 'closing-soon' ? 14 : 40 + Math.floor(rand() * 50);
  const closesOn = new Date(Date.parse(opensOn) + window * day).toISOString().slice(0, 10);

  return {
    id: `${province.toLowerCase()}-${districtId}-${pad(i + 1)}`,
    reference: `${province}/${districtId.slice(0, 3).toUpperCase()}/2026/${pad(101 + i * 7)}`,
    title: profile.title(place),
    province,
    district: districtName,
    municipality: `${place} local municipality`,
    coordinates: [Number(lng.toFixed(4)), Number(lat.toFixed(4))],
    sizeHa,
    arableHa,
    tenure: profile.tenure,
    enterprises: profile.enterprises,
    status,
    opensOn,
    closesOn,
    summary: profile.summary(place, districtName),
    water: profile.water,
    soil: profile.soil,
    rainfallMm: rainfall,
    infrastructure: profile.infrastructure,
    eligibility: ELIGIBILITY,
    applicationSteps: steps(place, districtName),
    contact: {
      office: `${districtName} land allocation office`,
      person: 'Land Allocation Desk',
      role: 'Parcel enquiries and application intake',
      phone: '+27 (0)00 000 0000',
      email: 'land.desk@example.com',
      address: `District office, ${place}`,
      hours: 'Monday to Friday, 08:00–16:00',
    },
    documents: DOCS,
    images: profile.images.map((variant) => ({
      variant,
      alt: `${IMAGE_CAPTIONS[variant]} for ${profile.title(place)}`,
      caption: IMAGE_CAPTIONS[variant],
    })),
    updatedAt: new Date(BASE + (i % 12) * day).toISOString(),
    verified: false,
  };
});

// Verify every coordinate actually falls inside the district it claims.
let failures = 0;
for (const l of listings) {
  const d = districts.find((f) => f.properties.name === l.district);
  if (!d) {
    console.error(`no such district: ${l.district}`);
    failures++;
    continue;
  }
  if (d.properties.province !== l.province) {
    console.error(`${l.id}: district ${l.district} is in ${d.properties.province}, not ${l.province}`);
    failures++;
  }
  if (!geoContains(d, l.coordinates)) {
    console.error(`${l.id}: ${l.coordinates} is outside ${l.district}`);
    failures++;
  }
}
if (failures) {
  console.error(`\n${failures} geometry check(s) failed`);
  process.exit(1);
}

const dataset = {
  revision: `seed-${new Date(BASE).toISOString().slice(0, 10)}`,
  updatedAt: new Date(BASE).toISOString(),
  listings,
};

fs.writeFileSync(
  new URL('../src/data/listings.json', import.meta.url),
  JSON.stringify(dataset, null, 2) + '\n',
);
console.log(`${listings.length} listings, all coordinates verified inside their district`);

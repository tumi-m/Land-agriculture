/**
 * Rebuilds src/data/sa-districts.topo.json from district boundaries.
 *
 *   npm run data:topo [retained-point-share]
 *
 * The source is downloaded on first run and cached beside this script. Province
 * outlines are not stored separately: they are merged from the district arcs at
 * runtime, which keeps shared borders exact and the payload to one file.
 */
import fs from 'node:fs';
import { topology } from 'topojson-server';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import { quantize } from 'topojson-client';

const PROVINCE_BY_DISTRICT = {
  'Alfred Nzo District': 'EC', 'Amathole District': 'EC', 'Buffalo City Metropolitan': 'EC',
  'Chris Hani District': 'EC', 'Joe Gqabi District': 'EC', 'Nelson Mandela Bay Metropolitan': 'EC',
  'O.R. Tambo District': 'EC', 'Sarah Baartman District': 'EC',
  'Fezile Dabi District': 'FS', 'Lejweleputswa District': 'FS', 'Mangaung Metropolitan': 'FS',
  'Thabo Mofutsanyana District': 'FS', 'Xhariep District': 'FS',
  'City of Johannesburg Metropolitan': 'GP', 'City of Tshwane Metropolitan': 'GP',
  'Ekurhuleni Metropolitan': 'GP', 'Sedibeng District': 'GP', 'West Rand District': 'GP',
  'Amajuba District': 'KZN', 'eThekwini Metropolitan': 'KZN', 'iLembe District': 'KZN',
  'Sisonke District': 'KZN', 'Ugu District': 'KZN', 'uMgungundlovu District': 'KZN',
  'Umkhanyakude District': 'KZN', 'Umzinyathi District': 'KZN', 'Uthukela District': 'KZN',
  'uThungulu District': 'KZN', 'Zululand District': 'KZN',
  'Capricorn District': 'LP', 'Mopani District': 'LP', 'Sekhukhune District': 'LP',
  'Vhembe District': 'LP', 'Waterberg District': 'LP',
  'Ehlanzeni District': 'MP', 'Gert Sibande District': 'MP', 'Nkangala District': 'MP',
  'Bojanala Platinum District': 'NW', 'Dr Kenneth Kaunda District': 'NW',
  'Dr Ruth Segomotsi Mompati District': 'NW', 'Ngaka Modiri Molema District': 'NW',
  'Frances Baard District': 'NC', 'John Taolo Gaetsewe District': 'NC', 'Namakwa District': 'NC',
  'Pixley ka Seme District': 'NC', 'ZF Mgcawu District': 'NC',
  'Cape Winelands District': 'WC', 'Central Karoo District': 'WC', 'City of Cape Town': 'WC',
  'Eden District': 'WC', 'Overberg District': 'WC', 'West Coast District': 'WC',
};

// 2015 dataset names -> current official municipal names
const RENAME = {
  'Eden District': 'Garden Route District',
  'Sisonke District': 'Harry Gwala District',
  'uThungulu District': 'King Cetshwayo District',
  'Umkhanyakude District': 'uMkhanyakude District',
  'Uthukela District': 'uThukela District',
  'Umzinyathi District': 'uMzinyathi District',
  'O.R. Tambo District': 'OR Tambo District',
  'Buffalo City Metropolitan': 'Buffalo City Metro',
  'Nelson Mandela Bay Metropolitan': 'Nelson Mandela Bay Metro',
  'City of Johannesburg Metropolitan': 'City of Johannesburg',
  'City of Tshwane Metropolitan': 'City of Tshwane',
  'Ekurhuleni Metropolitan': 'City of Ekurhuleni',
  'eThekwini Metropolitan': 'eThekwini Metro',
  'Mangaung Metropolitan': 'Mangaung Metro',
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const SOURCE_URL =
  'https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/south-africa.geojson';
const cache = new URL('./.cache-south-africa.geojson', import.meta.url);

if (!fs.existsSync(cache)) {
  console.log(`downloading ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`source responded ${res.status}`);
  fs.writeFileSync(cache, Buffer.from(await res.arrayBuffer()));
}

const src = JSON.parse(fs.readFileSync(cache, 'utf8'));

const features = src.features.map((f) => {
  const raw = f.properties.name;
  const province = PROVINCE_BY_DISTRICT[raw];
  if (!province) throw new Error(`Unmapped district: ${raw}`);
  const name = RENAME[raw] ?? raw;
  return { type: 'Feature', properties: { id: slug(name), name, province }, geometry: f.geometry };
});

const topo = topology({ districts: { type: 'FeatureCollection', features } });
const pre = presimplify(topo);
const targetShare = Number(process.argv[2] ?? 0.05);
const minWeight = quantile(pre, targetShare);
const simplified = simplify(pre, minWeight);
const out = quantize(simplified, 1e4);

const file = new URL('../src/data/sa-districts.topo.json', import.meta.url);
fs.writeFileSync(file, JSON.stringify(out));
const kb = (fs.statSync(file).size / 1024).toFixed(1);
const points = out.arcs.reduce((n, a) => n + a.length, 0);
console.log(`share=${targetShare} arcs=${out.arcs.length} points=${points} size=${kb}KB`);

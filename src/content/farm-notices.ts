import type { ProvinceCode } from "@/lib/types";
export const NOTICE_INDEX =
  "https://www.dlrrd.gov.za/index.php/component/content/article/235-application-to-lease-state-farms?Itemid=437&catid=79";
export const NOTICE_CHECKED = "2026-09-09";
export interface FarmNotice {
  id: string;
  name: string;
  province: ProvinceCode;
  district: string;
  municipality: string;
  hectares: number;
  closes: string;
  file: string;
  use: string;
  facts: string[];
  contact: string;
  phone: string;
  priority: string;
  reference: string;
  coordinates: [number, number] | null;
}
const base =
  "https://www.dlrrd.gov.za/images/application_to_lease_state_farms/2026/";
export const noticeUrl = (notice: FarmNotice) => base + notice.file;
export function noticeStatus(
  notice: FarmNotice,
  now = new Date(),
): "Deadline ahead" | "Closed" {
  return now.getTime() < Date.parse(notice.closes)
    ? "Deadline ahead"
    : "Closed";
}
// Transcribed from the linked DLRRD PDFs. Missing coordinates are deliberately null.
// A district label on the map is not a parcel location or cadastral boundary.
export const FARM_NOTICES: FarmNotice[] = [
  {
    id: "california-27",
    name: "California · Portion 27",
    province: "LP",
    district: "Mopani",
    municipality: "Greater Tzaneen",
    hectares: 21.4154,
    closes: "2026-09-21T16:00:00+02:00",
    file: "portion27-carlifonia-507lt.pdf",
    use: "Poultry",
    facts: [
      "Seven poultry houses; stated capacity 3,500 birds each.",
      "2 ha poultry facilities; 19.4154 ha buildings and veld.",
      "Water supply, electricity condition and soil tests are not supplied.",
    ],
    contact: "Fumani Nkuna",
    phone: "0824611846",
    priority: "Smallholder farmers; category 3",
    reference: "California 507 LT, portion 27 · LPID 382923",
    coordinates: null,
  },
  {
    id: "woolton-spilsby",
    name: "Woolton & Spilsby",
    province: "LP",
    district: "Vhembe",
    municipality: "Makhado",
    hectares: 1076.6321,
    closes: "2026-10-08T16:00:00+02:00",
    file: "Vetted-Lease-Woolton-Spilsby.pdf",
    use: "Crops · goats & sheep",
    facts: [
      "Lease unit 2: 516 ha, including 28 ha crops and 488 ha small stock.",
      "Lease unit 3: 560 ha, including 45 ha crops and 515 ha small stock.",
      "Lease-unit extents are rounded in the notice. Water rights and soil tests are not supplied.",
    ],
    contact: "Tshililo Gangashe",
    phone: "0798982908",
    priority: "Smallholder farmers; 3 years crop and small-stock experience",
    reference: "Remaining extents Woolton 343 MS and Spilsby 344 MS",
    coordinates: null,
  },
  {
    id: "paardevlei",
    name: "Paardevlei, Vaalpunt & Monte Christo",
    province: "LP",
    district: "Capricorn",
    municipality: "Lepelle Nkumpi",
    hectares: 1692.7856,
    closes: "2026-10-07T16:00:00+02:00",
    file: "Paardevlei-Vaalpunt-Monte-Christo.pdf",
    use: "Goats & sheep",
    facts: [
      "1,691 ha grazing; 1.7856 ha buildings.",
      "Water supply, fencing condition and carrying capacity are not supplied.",
    ],
    contact: "Welhemina Maphoto",
    phone: "0794935726",
    priority: "Smallholder farmers; 3 years small-stock experience",
    reference:
      "Paardevlei 201 KS ptn 4 RE; Vaalpunt 200 KS; Monte Christo 199 KS",
    coordinates: null,
  },
  {
    id: "glennis-moyle",
    name: "Glennis Moyle",
    province: "EC",
    district: "Sarah Baartman",
    municipality: "Ndlambe · Alexandria",
    hectares: 767.77,
    closes: "2026-10-05T16:00:00+02:00",
    file: "glennis-moyle.pdf",
    use: "Cattle · dryland crops",
    facts: [
      "666 ha natural veld; 100 ha arable dryland; 1.77 ha buildings.",
      "Notice carrying capacity: 3 ha per large stock unit. A stock unit is not automatically one animal.",
    ],
    contact: "Bongwekazi Zitho",
    phone: "0823087914",
    priority: "Military veterans; category 3",
    reference: "Farm 233 portion 14 and farm 410, Alexandria",
    coordinates: null,
  },
  {
    id: "newlands",
    name: "Newlands farms",
    province: "EC",
    district: "Sarah Baartman",
    municipality: "Dr Beyers Naudé · Jansenville",
    hectares: 2270.7553,
    closes: "2026-09-25T16:00:00+02:00",
    file: "newlands-farms.pdf",
    use: "Extensive livestock",
    facts: [
      "2,269.7553 ha veld and grazing; 1 ha buildings.",
      "Eleven listed portions across Bosch Rug, Newklip, Breede Laagte, Zwart Rivier and Klipfontein.",
    ],
    contact: "Mbali Zuma",
    phone: "0835789029",
    priority: "Women, youth and military veterans; category 3",
    reference: "11 LPIDs in the source notice",
    coordinates: null,
  },
  {
    id: "cornucopia",
    name: "Cornucopia",
    province: "EC",
    district: "Sarah Baartman",
    municipality: "Koukamma · Tsitsikamma",
    hectares: 46.581,
    closes: "2026-09-25T16:00:00+02:00",
    file: "cornucopia.pdf",
    use: "Crops · small-scale livestock",
    facts: [
      "24 ha irrigated pasture; 6 ha dryland pasture.",
      "10 ha drip-irrigated land; 3 ha tunnels; 3.581 ha other land.",
      "Irrigation infrastructure is described; licensed water volume and current condition need confirmation.",
    ],
    contact: "Mbali Zuma",
    phone: "0835789029",
    priority: "Military veterans; category 2",
    reference: "Cornucopia 437, Humansdorp RD · LPID 295381",
    coordinates: null,
  },
  {
    id: "hartebeestpoort-717",
    name: "Hartebeestpoort · Portion 717",
    province: "NW",
    district: "Bojanala",
    municipality: "Madibeng",
    hectares: 18.9551,
    closes: "2026-09-14T15:00:00+02:00",
    file: "Hartebeespoort-717-Vetted-Advert.pdf",
    use: "Broiler poultry",
    facts: [
      "14 ha fixed improvements described as vandalised: price rehabilitation before investing.",
      "4 ha irrigated arable land; notice states 10.7 ha scheduled water rights.",
      "EIA for 228,000 birds/cycle is stated; this is not verified operating capacity.",
    ],
    contact: "Tshisikhwawe Maphaha",
    phone: "0764236438",
    priority: "5 years broiler experience; category 3",
    reference: "Hartebeestpoort E 215 JQ, portion 717 · LPID 388216",
    coordinates: null,
  },
];

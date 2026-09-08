export interface Stage {
  id: string;
  actor: string;
  name: string;
  duration: string;
  /** Approximate working days, used to draw the timeline to scale. */
  days: number;
  detail: string;
}

/** What happens to your form after you drop it in the tender box. */
export const STAGES: Stage[] = [
  {
    id: 'intake',
    actor: 'District office',
    name: 'Advert closes and applications are logged',
    duration: 'On closing day',
    days: 1,
    detail:
      'Every form submitted against the advertised farm is captured into the district and provincial database. Late submissions are not carried into the next round.',
  },
  {
    id: 'dbsc',
    actor: 'District Beneficiary Screening Committee',
    name: 'Screening, scoring and interviews',
    duration: 'About 2 weeks',
    days: 14,
    detail:
      'Compliance is checked, applicants are scored against the advertised criteria, asset disclosures are verified and shortlisted applicants are interviewed in person.',
  },
  {
    id: 'ptc',
    actor: 'Provincial Technical Committee',
    name: 'Feasibility against provincial plans',
    duration: 'About 3 weeks',
    days: 21,
    detail:
      'The shortlist is tested for operational feasibility against regional agricultural development plans and water availability.',
  },
  {
    id: 'nsac',
    actor: 'National Selection and Approval Committee',
    name: 'National review and determination',
    duration: 'About 3 weeks',
    days: 21,
    detail:
      'Geographic targets, demographic quotas and transformation balances are applied, and the determination goes to the Director-General and Minister.',
  },
  {
    id: 'contract',
    actor: 'Land Administration Unit',
    name: 'Lease issued and signed',
    duration: 'Within 30 days',
    days: 30,
    detail:
      'The contract must be executed within 30 calendar days of approval. Unsuccessful applicants are notified in writing and may take the decision to the Land Allocation Appeals Committee.',
  },
];

export const TOTAL_DAYS = STAGES.reduce((sum, s) => sum + s.days, 0);

export interface FormSection {
  name: string;
  detail: string;
}

/** The sections of Form ALA — Application for Agricultural State Land Allocation. */
export const FORM_SECTIONS: FormSection[] = [
  {
    name: 'Property identification',
    detail:
      'Advertised farm name, title deed description, the 21-digit surveyor-general code, local municipality, district and coordinates.',
  },
  {
    name: 'Applicant and legal entity',
    detail:
      'Natural person or juristic entity — sole proprietorship, close corporation, private company, trust or co-operative.',
  },
  {
    name: 'Farming background and resource audit',
    detail:
      'Track record, current enterprise, herd sizes, historical yields, training certificates and your current tenure status.',
  },
  {
    name: 'Agricultural business plan',
    detail:
      'Enterprise budgets, cash-flow projections, environmental management, irrigation water source, labour requirements and market off-take arrangements.',
  },
  {
    name: 'Statutory clearance',
    detail: 'A valid Tax Compliance Status (TCS) PIN from SARS.',
  },
];

export interface DocumentRequirement {
  label: string;
  appliesTo: 'everyone' | 'entity';
  note?: string;
}

export const DOCUMENTS: DocumentRequirement[] = [
  { label: 'Certified copy of your ID', appliesTo: 'everyone' },
  { label: 'Proof of residential address', appliesTo: 'everyone' },
  { label: 'Tax Compliance Status PIN from SARS', appliesTo: 'everyone' },
  { label: 'Five-year agricultural business plan', appliesTo: 'everyone' },
  { label: 'Cash-flow projection and proof of own contribution', appliesTo: 'everyone' },
  { label: 'Evidence of farming experience, training or a mentorship agreement', appliesTo: 'everyone' },
  {
    label: 'Unabridged CIPC registration certificate',
    appliesTo: 'entity',
    note: 'Companies, close corporations and co-operatives.',
  },
  {
    label: 'Certified IDs of every director, member or trustee',
    appliesTo: 'entity',
  },
  {
    label: 'Formal resolution authorising the nominated signatory',
    appliesTo: 'entity',
  },
];

export interface Exclusion {
  id: string;
  rule: string;
  severity: 'bar' | 'wait';
  detail: string;
}

/** Who may not apply, and who has to wait. Enforced strictly. */
export const EXCLUSIONS: Exclusion[] = [
  {
    id: 'public-servant',
    rule: 'Serving public servants and their spouses',
    severity: 'bar',
    detail:
      'Employees at national, provincial and local level, and of state-owned enterprises, together with their spouses, are prohibited from applying.',
  },
  {
    id: 'cooling-24',
    rule: 'Former public servants — 24 months',
    severity: 'wait',
    detail: 'A mandatory 24-month cooling-off period after leaving state employment.',
  },
  {
    id: 'cooling-12',
    rule: 'Former political office bearers — 12 months',
    severity: 'wait',
    detail: 'A 12-month cooling-off period before an application will be accepted.',
  },
  {
    id: 'prior-abandonment',
    rule: 'Previously abandoned or damaged state land',
    severity: 'bar',
    detail:
      'Anyone who abandoned a state-allocated farm, vandalised its infrastructure or mismanaged public grant funds is permanently barred.',
  },
];

export const RESIDENCE_RULE =
  'A successful applicant must live on the farm full-time for the duration of the lease.';

export const SUBMISSION_RULE =
  'Applications are sealed in an envelope endorsed on the outside with the farm name, and deposited in the tender box at the relevant office. Forms come from the department’s website or the nearest office.';

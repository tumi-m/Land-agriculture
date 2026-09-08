import { CATEGORIES, type CategoryId } from '@/content/categories';
import { FINANCE_TIERS } from '@/content/finance';
import { EXCLUSIONS } from '@/content/process';
import { PROVINCES } from '@/content/provinces';
import type { Block } from './blocks';
import type { ProvinceCode } from './types';

export type Scale = 'household' | 'smallholder' | 'medium' | 'large';
export type Entity = 'individual' | 'entity';
export type Employment = 'none' | 'serving' | 'left-service' | 'left-office';

export interface Answers {
  province: ProvinceCode | null;
  scale: Scale | null;
  entity: Entity | null;
  employment: Employment | null;
  enterprises: string[];
}

export const EMPTY_ANSWERS: Answers = {
  province: null,
  scale: null,
  entity: null,
  employment: null,
  enterprises: [],
};

const CATEGORY_BY_SCALE: Record<Scale, CategoryId> = {
  household: 1,
  smallholder: 2,
  medium: 3,
  large: 4,
};

const SCALE_REASON: Record<Scale, string> = {
  household:
    'You farm to feed the household with little or no marketable surplus, which is Category 1 under the selection policy.',
  smallholder:
    'You sell a surplus into local and informal markets on turnover under about R1m, which is Category 2.',
  medium:
    'Dependable commercial returns on turnover between roughly R1m and R10m puts you in Category 3 — the first tier that can eventually buy the land.',
  large:
    'Turnover above R10m makes you Category 4: commercial rental, no operating grants, and a standard purchase option.',
};

const FINANCE_BY_SCALE: Record<Scale, FinanceTierId | null> = {
  household: null,
  smallholder: 'smallholder',
  medium: 'medium',
  large: 'large',
};

type FinanceTierId = (typeof FINANCE_TIERS)[number]['id'];

/** Progress through the question set, used to drive the reveal. */
export function answered(answers: Answers): number {
  return [answers.province, answers.scale, answers.entity, answers.employment].filter(Boolean)
    .length;
}

export const QUESTION_COUNT = 4;

/**
 * Turns a set of answers into the blocks that make up a personalised route.
 *
 * Deterministic and synchronous: the same answers always compose the same
 * result. The shape is what a model would need to emit to take this over —
 * typed blocks, no markup — so swapping the engine for a model later is a
 * change of source, not of renderer.
 */
export function compose(answers: Answers): Block[] {
  const blocks: Block[] = [];
  const { province, scale, entity, employment } = answers;

  if (employment === 'serving') {
    blocks.push({
      kind: 'blocker',
      id: 'blocked-serving',
      severity: 'bar',
      title: 'You cannot apply while in state employment',
      detail:
        EXCLUSIONS.find((e) => e.id === 'public-servant')?.detail ??
        'Serving public servants and their spouses are prohibited from applying.',
      clears: 'Twenty-four months after you leave.',
    });
  }

  if (employment === 'left-service') {
    blocks.push({
      kind: 'blocker',
      id: 'blocked-cooling-24',
      severity: 'wait',
      title: 'A 24-month cooling-off period applies',
      detail:
        'Former public servants must wait two years from their last day in state employment before an application is accepted.',
      clears: 'Count 24 months from your final day of service.',
    });
  }

  if (employment === 'left-office') {
    blocks.push({
      kind: 'blocker',
      id: 'blocked-cooling-12',
      severity: 'wait',
      title: 'A 12-month cooling-off period applies',
      detail:
        'Former political office bearers must wait a year before submitting an application.',
      clears: 'Count 12 months from the day you left office.',
    });
  }

  if (scale) {
    const category = CATEGORY_BY_SCALE[scale];
    blocks.push({
      kind: 'verdict',
      id: 'verdict',
      category,
      because: SCALE_REASON[scale],
    });
    blocks.push({ kind: 'tenure', id: 'tenure', category });

    const tierId = FINANCE_BY_SCALE[scale];
    const tier = FINANCE_TIERS.find((t) => t.id === tierId);
    if (tier) {
      blocks.push({ kind: 'finance', id: 'finance', tier, qualifies: true });
    } else {
      blocks.push({
        kind: 'note',
        id: 'finance-none',
        tone: 'neutral',
        title: 'Blended finance is not aimed at you',
        body: 'The Blended Finance Scheme starts at R50 000 turnover. At household scale the route is CASP infrastructure support and input assistance through your provincial extension office, not Land Bank debt.',
      });
    }

    if (!CATEGORIES.find((c) => c.id === category)?.canBuy) {
      blocks.push({
        kind: 'caution',
        id: 'caution-tenure',
        riskId: 'tenure',
      });
    }
  }

  if (province) {
    const record = PROVINCES[province];
    const wanted = answers.enterprises;
    const matched = wanted.filter((w) =>
      record.commodities.some((c) => c.toLowerCase().includes(w.toLowerCase())),
    );
    blocks.push({
      kind: 'province-fit',
      id: 'fit',
      province,
      matched,
      unmatched: wanted.filter((w) => !matched.includes(w)),
    });
    blocks.push({ kind: 'office', id: 'office', province });
  }

  if (entity) {
    blocks.push({ kind: 'checklist', id: 'checklist', applicant: entity });
  }

  if (scale && province) {
    blocks.push({ kind: 'timeline', id: 'timeline' });
    blocks.push({ kind: 'caution', id: 'caution-contracts', riskId: 'contracts' });
  }

  return blocks;
}

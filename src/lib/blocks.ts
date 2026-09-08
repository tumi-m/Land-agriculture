import type { CategoryId } from '@/content/categories';
import type { FinanceTier } from '@/content/finance';
import type { ProvinceCode } from './types';

/**
 * The vocabulary the answer engine may emit.
 *
 * Nothing composes markup: the engine returns typed data and the registry in
 * components/blocks decides how each kind is drawn. Adding a block kind means
 * adding a type here and a component there — never HTML in the engine, and never
 * a renderer that guesses at fields it was not given.
 */
export type Block =
  | { kind: 'verdict'; id: string; category: CategoryId; because: string }
  | {
      kind: 'blocker';
      id: string;
      severity: 'bar' | 'wait';
      title: string;
      detail: string;
      clears?: string;
    }
  | { kind: 'tenure'; id: string; category: CategoryId }
  | { kind: 'finance'; id: string; tier: FinanceTier; qualifies: boolean }
  | { kind: 'office'; id: string; province: ProvinceCode }
  | { kind: 'checklist'; id: string; applicant: 'individual' | 'entity' }
  | { kind: 'timeline'; id: string }
  | {
      kind: 'province-fit';
      id: string;
      province: ProvinceCode;
      matched: string[];
      unmatched: string[];
    }
  | { kind: 'caution'; id: string; riskId: string }
  | { kind: 'note'; id: string; title: string; body: string; tone: 'neutral' | 'good' };

export type BlockKind = Block['kind'];

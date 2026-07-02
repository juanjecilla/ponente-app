// Cost tiers a speaker can require for a given city.
// LOCAL type — reconcile with `src/types` (CostTier) when task 03 lands.
export type CostTier = 'free' | 'self-covered' | 'needs-expenses';

// Order shown in the tier picker.
export const COST_TIERS: readonly CostTier[] = [
  'free',
  'self-covered',
  'needs-expenses',
] as const;

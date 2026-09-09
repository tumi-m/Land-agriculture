export type Enterprise =
  "vegetables" | "grain" | "cattle" | "smallstock" | "poultry";
export const ENTERPRISES: Record<
  Enterprise,
  { name: string; unit: string; output: string }
> = {
  vegetables: {
    name: "Vegetables",
    unit: "Cultivated hectares",
    output: "Saleable tonnes / ha / cycle",
  },
  grain: {
    name: "Field crops",
    unit: "Cultivated hectares",
    output: "Saleable tonnes / ha / cycle",
  },
  cattle: {
    name: "Beef cattle",
    unit: "Breeding cows",
    output: "Animals sold / cow / year",
  },
  smallstock: {
    name: "Goats & sheep",
    unit: "Breeding females",
    output: "Animals sold / female / year",
  },
  poultry: {
    name: "Poultry",
    unit: "Birds placed / cycle",
    output: "Saleable proportion (0–1)",
  },
};
export interface Budget {
  units: number;
  output: number;
  price: number;
  cycles: number;
  variable: number;
  fixed: number;
  capital: number;
  reserve: number;
  marketing: number;
}
// No commercial assumptions are silently pre-filled. Zero fixed costs/capital must be entered explicitly.
export function calculateBudget(
  b: Budget,
  factor = 1,
  enterprise?: Enterprise,
) {
  if (
    Object.values(b).some((v) => !Number.isFinite(v) || v < 0) ||
    b.units <= 0 ||
    b.output <= 0 ||
    b.price <= 0 ||
    b.cycles <= 0 ||
    b.marketing >= 100 ||
    !Number.isFinite(factor) ||
    factor <= 0
  )
    return null;
  const quantity =
    b.units *
    (enterprise === "poultry"
      ? Math.min(1, b.output * factor)
      : b.output * factor) *
    b.cycles;
  const revenue = quantity * b.price * factor;
  const costs =
    b.units * b.variable * b.cycles + b.fixed + (revenue * b.marketing) / 100;
  if (!Number.isFinite(revenue) || !Number.isFinite(costs)) return null;
  const surplus = revenue - costs;
  const initialCapital = b.capital + b.reserve;
  const breakEvenPrice =
    (b.units * b.variable * b.cycles + b.fixed) /
    (quantity * (1 - b.marketing / 100));
  return {
    quantity,
    revenue,
    costs,
    surplus,
    initialCapital,
    breakEvenPrice,
    yearOneCash: surplus - b.capital,
    fiveYears: Array.from({ length: 5 }, (_, i) => ({
      year: i + 1,
      cumulative: surplus * (i + 1) - b.capital,
    })),
  };
}

"use client";
import { useState } from "react";
import {
  calculateBudget,
  ENTERPRISES,
  type Enterprise,
  type Budget,
} from "@/lib/farm-budget";
const money = (n: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(n);
const fields: [keyof Budget, string][] = [
  ["units", "Scale"],
  ["output", "Output"],
  ["price", "Sale price / tonne or animal (R)"],
  ["cycles", "Cycles per year (use 1 for breeding livestock)"],
  ["variable", "Operating cost / ha or animal / cycle (R)"],
  ["marketing", "Marketing costs (% of sales)"],
  ["fixed", "Annual overhead, rent & finance costs (R)"],
  ["capital", "One-time setup, repairs & initial stock (R)"],
  ["reserve", "Working-capital reserve (R)"],
];
export default function FarmBudget({ scope }: { scope: string }) {
  const [enterprise, setEnterprise] = useState<Enterprise>("vegetables");
  const [values, setValues] = useState<
    Partial<Record<Enterprise, Partial<Record<keyof Budget, string>>>>
  >({});
  const data = values[enterprise] ?? {};
  const complete = fields.every(
    ([k]) => data[k] !== undefined && data[k] !== "",
  );
  const budget = Object.fromEntries(
    fields.map(([k]) => [k, Number(data[k])]),
  ) as unknown as Budget;
  const invalid =
    (enterprise === "poultry" && budget.output > 1) ||
    (["cattle", "smallstock"].includes(enterprise) && budget.cycles !== 1);
  const result =
    complete && !invalid ? calculateBudget(budget, 1, enterprise) : null;
  return (
    <section className="farm-budget">
      <p className="eyebrow">CAPITAL & SCENARIOS</p>
      <h3>Build a farming case</h3>
      <p className="dossier-note">
        {scope}. Your assumptions drive these calculations. A model does not
        establish land suitability or permission to farm.
      </p>
      <label className="dossier-field">
        Enterprise
        <select
          value={enterprise}
          onChange={(e) => setEnterprise(e.target.value as Enterprise)}
        >
          {Object.entries(ENTERPRISES).map(([id, e]) => (
            <option key={id} value={id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>
      <details open>
        <summary>Cost & production assumptions</summary>
        <div className="budget-fields">
          {fields.map(([key, label]) => (
            <label className="dossier-field" key={key}>
              {key === "units"
                ? ENTERPRISES[enterprise].unit
                : key === "output"
                  ? ENTERPRISES[enterprise].output
                  : label}
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="Enter amount"
                value={data[key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    [enterprise]: { ...v[enterprise], [key]: e.target.value },
                  }))
                }
              />
            </label>
          ))}
        </div>
      </details>
      <p className="dossier-note">
        Include seed/feed, labour, water, energy, vet care, transport and
        maintenance in operating costs. Enter 0 only where a cost genuinely does
        not apply. Obtain local quotes; total farm hectares are not
        automatically productive hectares.
      </p>
      {!result ? (
        <p className="dossier-callout" role="status">
          {invalid
            ? "Poultry saleable proportion must be at most 1; breeding livestock uses one annual cycle."
            : "Enter all assumptions to calculate capital, break-even and cash scenarios."}
        </p>
      ) : (
        <div aria-live="polite">
          <div className="dossier-stats">
            <div>
              <small>Setup + reserve needed</small>
              <strong>{money(result.initialCapital)}</strong>
            </div>
            <div>
              <small>Annual operating surplus</small>
              <strong>{money(result.surplus)}</strong>
            </div>
            <div>
              <small>Break-even sale price</small>
              <strong>{money(result.breakEvenPrice)}</strong>
            </div>
            <div>
              <small>Year 1 net cash*</small>
              <strong>{money(result.yearOneCash)}</strong>
            </div>
          </div>
          <h4>Yield & price sensitivity</h4>
          <div className="scenario-cards">
            {[
              ["Downside", 0.8],
              ["Your case", 1],
              ["Upside", 1.2],
            ].map(([name, f]) => {
              const r = calculateBudget(budget, Number(f), enterprise)!;
              return (
                <div key={name}>
                  <small>
                    {name} · both {Math.round((Number(f) - 1) * 100)}%
                  </small>
                  <strong>{money(r.surplus)}</strong>
                  <span>annual operating surplus</span>
                </div>
              );
            })}
          </div>
          <details>
            <summary>Five-year cash view</summary>
            {result.fiveYears.map((y) => (
              <div className="cash-row" key={y.year}>
                <span>Year {y.year}</span>
                <strong>{money(y.cumulative)}</strong>
              </div>
            ))}
            <p className="dossier-note">
              *Cumulative cash subtracts setup once. The reserve is a funding
              buffer, not an extra expense; spending is already included in
              operating costs. Constant prices and production, no inflation,
              tax, depreciation, stock growth, residual value or loan principal.
              Interest belongs in your annual costs. Sensitivity changes output
              and price together, keeping production costs fixed. Poultry sales
              are capped at birds placed. These are scenarios, not return
              forecasts.
            </p>
          </details>
        </div>
      )}
      <a
        className="dossier-source"
        href="https://www.landbank.co.za/Media-Centre/Pages/Publications.aspx"
        target="_blank"
        rel="noreferrer"
      >
        Land Bank enterprise budget references ↗
      </a>
    </section>
  );
}

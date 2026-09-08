"use client";

import { useEffect, useMemo, useState } from "react";
import BlockView from "./blocks/BlockView";
import { PROVINCES, PROVINCE_ORDER } from "@/content/provinces";
import { cx } from "@/lib/format";
import {
  EMPTY_ANSWERS,
  QUESTION_COUNT,
  answered,
  compose,
  type Answers,
  type Employment,
  type Entity,
  type Scale,
} from "@/lib/pathfinder";
import type { ProvinceCode } from "@/lib/types";

const SCALES: { id: Scale; label: string; hint: string }[] = [
  {
    id: "household",
    label: "To feed my household",
    hint: "Little or no surplus sold",
  },
  {
    id: "smallholder",
    label: "Household plus some sales",
    hint: "Under about R1m a year",
  },
  {
    id: "medium",
    label: "A commercial operation",
    hint: "Roughly R1m – R10m a year",
  },
  { id: "large", label: "A large agribusiness", hint: "Above R10m a year" },
];

const EMPLOYMENT: { id: Employment; label: string }[] = [
  { id: "none", label: "None of these" },
  { id: "serving", label: "I or my spouse work for the state or an SOE" },
  { id: "left-service", label: "I left state employment in the last 2 years" },
  { id: "left-office", label: "I left political office in the last year" },
];

const ENTITIES: { id: Entity; label: string; hint: string }[] = [
  { id: "individual", label: "In my own name", hint: "Natural person" },
  {
    id: "entity",
    label: "Through a company, trust or co-op",
    hint: "Juristic entity",
  },
];

const ENTERPRISES = [
  "Poultry",
  "Beef cattle",
  "Goats",
  "Sheep",
  "Maize",
  "Vegetables",
  "Citrus",
  "Sugar cane",
  "Dairy",
  "Piggery",
];

export default function Pathfinder({
  onProvinceChange,
  selectedProvince,
}: {
  selectedProvince?: ProvinceCode | null;
  onProvinceChange?: (code: ProvinceCode) => void;
}) {
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  useEffect(() => {
    if (selectedProvince)
      setAnswers((previous) => ({ ...previous, province: selectedProvince }));
  }, [selectedProvince]);
  const blocks = useMemo(() => compose(answers), [answers]);
  const progress = answered(answers);

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-10">
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <p className="eyebrow">Four questions</p>
          <p className="num text-2xs text-muted">
            {progress} / {QUESTION_COUNT}
          </p>
        </div>
        <div className="mt-2 h-0.5 w-full bg-rule">
          <div
            className="h-full bg-clay transition-[width] duration-500 ease-out"
            style={{ width: `${(progress / QUESTION_COUNT) * 100}%` }}
          />
        </div>

        <Question label="Where do you want to farm?">
          <div className="flex flex-wrap gap-1.5">
            {PROVINCE_ORDER.map((code) => (
              <Choice
                key={code}
                on={answers.province === code}
                onClick={() => {
                  set("province", code);
                  onProvinceChange?.(code);
                }}
              >
                {PROVINCES[code].name}
              </Choice>
            ))}
          </div>
        </Question>

        <Question label="How do you farm, or plan to?">
          <div className="space-y-1.5">
            {SCALES.map((s) => (
              <Row
                key={s.id}
                on={answers.scale === s.id}
                onClick={() => set("scale", s.id)}
              >
                <span className="text-ink">{s.label}</span>
                <span className="text-xs text-muted">{s.hint}</span>
              </Row>
            ))}
          </div>
        </Question>

        <Question label="How would you apply?">
          <div className="space-y-1.5">
            {ENTITIES.map((e) => (
              <Row
                key={e.id}
                on={answers.entity === e.id}
                onClick={() => set("entity", e.id)}
              >
                <span className="text-ink">{e.label}</span>
                <span className="text-xs text-muted">{e.hint}</span>
              </Row>
            ))}
          </div>
        </Question>

        <Question label="Does any of this apply to you?">
          <div className="space-y-1.5">
            {EMPLOYMENT.map((e) => (
              <Row
                key={e.id}
                on={answers.employment === e.id}
                onClick={() => set("employment", e.id)}
              >
                <span className="text-ink">{e.label}</span>
              </Row>
            ))}
          </div>
        </Question>

        <Question label="What would you produce? (optional)">
          <div className="flex flex-wrap gap-1.5">
            {ENTERPRISES.map((e) => (
              <Choice
                key={e}
                on={answers.enterprises.includes(e)}
                onClick={() =>
                  set(
                    "enterprises",
                    answers.enterprises.includes(e)
                      ? answers.enterprises.filter((x) => x !== e)
                      : [...answers.enterprises, e],
                  )
                }
              >
                {e}
              </Choice>
            ))}
          </div>
        </Question>

        {progress > 0 && (
          <button
            type="button"
            className="btn mt-5"
            onClick={() => setAnswers(EMPTY_ANSWERS)}
          >
            Start again
          </button>
        )}
      </div>

      <div
        aria-live="polite"
        className="min-w-0 lg:sticky lg:top-20 lg:self-start"
      >
        {blocks.length === 0 ? (
          <div className="flex h-full min-h-[16rem] flex-col justify-center border border-dashed border-rule p-8">
            <p className="font-display text-opener leading-tight text-ink">
              Answer on the left and your route assembles here.
            </p>
            <p className="lede mt-3">
              Which category you fall into, what lease and rent that carries,
              whether you can ever own the land, what finance you qualify for,
              which office takes your form, and what to attach to it.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {blocks.map((block, i) => (
              <BlockView key={block.id} block={block} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Question({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="mt-6">
      <legend className="mb-2 font-display text-lg leading-tight text-ink">
        {label}
      </legend>
      {children}
    </fieldset>
  );
}

function Choice({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        "border px-2.5 py-1 text-sm transition-colors duration-150",
        on
          ? "border-clay bg-clay text-paper"
          : "border-rule bg-raised text-muted hover:border-ink/30 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Row({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        "flex w-full flex-col items-start gap-0.5 border px-3 py-2 text-left text-sm transition-colors duration-150",
        on
          ? "border-clay bg-clay-soft/60"
          : "border-rule bg-raised hover:border-ink/30",
      )}
    >
      {children}
    </button>
  );
}

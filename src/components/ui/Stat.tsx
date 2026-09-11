import { cx } from "@/lib/format";

/** One number, its unit and its source. Unknown values stay honest. */
export function Stat({
  value,
  unit,
  label,
  source,
  nullLabel = "Not recorded",
  tone,
  className,
}: {
  /** Already-formatted number, or null when the data does not say. */
  value: number | string | null;
  unit?: string;
  label: string;
  /** Where this figure comes from, shown under the number. */
  source?: string;
  nullLabel?: string;
  tone?: "good" | "critical";
  className?: string;
}) {
  return (
    <div className={cx("stat", className)}>
      <dd
        className={cx(
          "stat-value",
          tone === "good" && "text-good",
          tone === "critical" && "text-critical",
        )}
      >
        {value === null ? (
          <span className="stat-null">{nullLabel}</span>
        ) : (
          <>
            <span className="num">{value}</span>
            {unit && <span className="stat-unit"> {unit}</span>}
          </>
        )}
      </dd>
      <dt className="stat-label">{label}</dt>
      {source && <small className="stat-source">{source}</small>}
    </div>
  );
}
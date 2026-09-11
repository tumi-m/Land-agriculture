import { cx } from "@/lib/format";

/** A small labelled chip, optionally with a colour dot. */
export function Chip({
  label,
  dot,
  tone = "neutral",
  className,
}: {
  label: string;
  dot?: string;
  tone?: "neutral" | "good" | "critical" | "warn";
  className?: string;
}) {
  return (
    <span className={cx("chip", tone !== "neutral" && `chip-${tone}`, className)}>
      {dot && <i aria-hidden="true" style={{ background: dot }} />}
      {label}
    </span>
  );
}
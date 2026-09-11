/** Where a figure came from: provider, date, and resolution for rasters. */
export function SourceNote({
  source,
  date,
  resolution,
  note,
}: {
  source: string;
  date?: string;
  resolution?: string;
  note?: string;
}) {
  const parts = [source, resolution, date].filter(Boolean).join(" · ");
  return (
    <small className="source-note">
      <span className="num">{parts}</span>
      {note && <span> — {note}</span>}
    </small>
  );
}
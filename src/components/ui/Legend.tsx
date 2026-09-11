/** A legend strip for a sequential ramp: swatches plus the end labels. */
export function Legend({
  swatches,
  start,
  end,
  caption,
  unit,
}: {
  swatches: string[];
  start: string;
  end: string;
  caption?: string;
  unit?: string;
}) {
  return (
    <div className="legend" role="img" aria-label={`${start} to ${end}${unit ? ` ${unit}` : ""}`}>
      <div className="legend-strip">
        {swatches.map((colour, index) => (
          <i key={index} style={{ background: colour }} aria-hidden="true" />
        ))}
      </div>
      <div className="legend-labels">
        <span className="num">
          {start}
          {unit}
        </span>
        <span className="num">
          {end}
          {unit}
        </span>
      </div>
      {caption && <small className="legend-caption">{caption}</small>}
    </div>
  );
}
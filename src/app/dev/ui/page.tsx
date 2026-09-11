"use client";

import { notFound } from "next/navigation";
import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { Legend } from "@/components/ui/Legend";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { Slider } from "@/components/ui/Slider";
import { SourceNote } from "@/components/ui/SourceNote";
import { Stat } from "@/components/ui/Stat";
import { Switch } from "@/components/ui/Switch";
import { LAND_RAMP_LIGHT } from "@/design/ramps";

/** Dev-only gallery: every primitive, in its main states. */
export default function DevUiPage() {
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<"peek" | "half" | "full">("half");
  const [depth, setDepth] = useState(0.72);
  const [water, setWater] = useState(true);
  const [scale, setScale] = useState<"household" | "medium">("medium");
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main
      className="mx-auto max-w-[80rem] space-y-10 px-4 py-10"
      data-dev-ui
    >
      <h1 className="font-display text-opener text-ink">UI primitives</h1>

      <section aria-label="Stats">
        <h2 className="eyebrow">Stat & SourceNote</h2>
        <div className="mt-3 flex flex-wrap gap-6">
          <Stat value="896" unit="farms" label="Advertised Oct 2020" source="DLRRD land audit" />
          <Stat value={700000} unit="ha" label="Total area" source="DLRRD land audit" />
          <Stat value={null} label="State share, Gauteng" source="Land audit" />
          <Stat value="2" unit="days" label="Deadline" tone="critical" />
        </div>
        <SourceNote
          source="DLRRD"
          date="Oct 2020"
          resolution="per province"
          note="Figures are historical, not availability."
        />
      </section>

      <section aria-label="Legend">
        <h2 className="eyebrow">Legend</h2>
        <div className="mt-3 max-w-sm">
          <Legend
            swatches={[...LAND_RAMP_LIGHT]}
            start="0"
            end="300 000"
            unit=" ha"
            caption="Heights show statistics, not elevation."
          />
        </div>
      </section>

      <section aria-label="Controls">
        <h2 className="eyebrow">Segmented · Switch · Slider · IconButton · Chip</h2>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Segmented
            label="Farm scale"
            options={[
              { id: "household", label: "Household" },
              { id: "medium", label: "Medium" },
            ]}
            value={scale}
            onChange={setScale}
          />
          <Switch checked={water} onChange={setWater} label="Rivers" />
          <div className="w-64">
            <Slider
              value={depth}
              onChange={setDepth}
              label="Depth"
              format={(v) => `${Math.round(v * 100)}%`}
            />
          </div>
          <IconButton label="Zoom in" onClick={() => {}}>+</IconButton>
          <Chip label="22 notices" dot="#cfe78b" />
          <Chip label="Deadline ahead" tone="warn" />
        </div>
      </section>

      <section aria-label="Sheet">
        <h2 className="eyebrow">Sheet</h2>
        <button className="btn mt-3" onClick={() => setOpen(true)}>
          Open sheet
        </button>
        <Sheet
          open={open}
          onClose={() => setOpen(false)}
          onSnapChange={setSnap}
          snap={snap}
          title="Example sheet"
        >
          <p className="text-sm text-muted">
            Drag the handle, use the snap buttons, or press Escape. At full the
            focus is trapped; at half the stage stays interactive.
          </p>
        </Sheet>
      </section>
    </main>
  );
}
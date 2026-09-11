"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Pathfinder from "@/components/Pathfinder";
import ProvinceRanking from "@/components/ProvinceRanking";
import { PROVINCE_ORDER } from "@/content/provinces";
import type { Scale } from "@/lib/pathfinder";
import type { ProvinceCode } from "@/lib/types";

/** ?category=1..4 preselects the matching scale answer. */
const SCALE_BY_CATEGORY: Record<string, Scale> = {
  "1": "household",
  "2": "smallholder",
  "3": "medium",
  "4": "large",
};

function validProvince(value: string | null): ProvinceCode | null {
  return value && (PROVINCE_ORDER as string[]).includes(value.toUpperCase())
    ? (value.toUpperCase() as ProvinceCode)
    : null;
}

/**
 * The route planner on the guide page. ?province= and ?category= preselect
 * answers; picking a province writes it back to the URL so the link stays
 * shareable.
 */
export function PathfinderPanel() {
  const params = useSearchParams();
  const [province, setProvince] = useState<ProvinceCode | null>(() =>
    validProvince(params.get("province")),
  );
  const scale = params.get("category");
  return (
    <Pathfinder
      selectedProvince={province}
      initialAnswers={scale && SCALE_BY_CATEGORY[scale] ? { scale: SCALE_BY_CATEGORY[scale] } : undefined}
      onProvinceChange={(code) => {
        setProvince(code);
        const url = new URL(window.location.href);
        url.searchParams.set("province", code);
        window.history.replaceState(null, "", url);
      }}
    />
  );
}

/**
 * The province ranking on the guide page. There is no map here, so choosing
 * a province opens the explorer focused on it.
 */
export function RankingPanel() {
  return (
    <ProvinceRanking
      selected={null}
      onSelect={(code) => {
        window.location.assign(`/?province=${code}`);
      }}
    />
  );
}

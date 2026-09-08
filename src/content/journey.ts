import {
  PROVINCES,
  ADVERTISED_TOTAL_PUBLISHED,
  ADVERTISED_FARMS,
} from "./provinces";
import { group } from "@/lib/format";
import type { Metric } from "@/lib/land-metrics";
import type { ProvinceCode } from "@/lib/types";

export interface JourneyStep {
  id: string;
  label: string;
  period: string;
  title: string;
  narration: string;
  figure: string;
  figureLabel: string;
  reading: string;
  metric: Metric;
  province: ProvinceCode | null;
}

/** A guided reading of existing reference data, not a sequence of current offers. */
export const LAND_JOURNEY: JourneyStep[] = [
  {
    id: "national",
    label: "The big picture",
    period: "OCTOBER 2020 · NATIONAL ANNOUNCEMENT",
    title: "The land is only the beginning.",
    narration: `${ADVERTISED_FARMS} state farms were included in the October 2020 announcement. Behind every hectare is a different landscape: grazing country, a grain field or an orchard. Explore where the land was advertised, then look closer at the water, farming system and support your plans would need.`,
    figure: `${group(ADVERTISED_TOTAL_PUBLISHED)} ha`,
    figureLabel: "Published national total",
    reading:
      "This is a historical snapshot. It does not tell you which farms are available today.",
    metric: "advertised",
    province: null,
  },
  {
    id: "distribution",
    label: "Where it sits",
    period: "NORTH WEST · OCTOBER 2020",
    title: "Where grazing meets the grain belt.",
    narration: `North West accounts for ${group(PROVINCES.NW.advertised2020)} advertised hectares in the provincial reference. Its farming profile includes beef cattle, goats, maize and sunflower. A large provincial total is a starting point for research, not a guarantee of a suitable farm.`,
    figure: `${group(PROVINCES.NW.advertised2020)} ha`,
    figureLabel: "Advertised in North West",
    reading:
      "Read the farming system alongside the number. Land area alone says little about water, infrastructure or fit.",
    metric: "advertised",
    province: "NW",
  },
  {
    id: "release",
    label: "Read the dates",
    period: "FEBRUARY 2020 · A SEPARATE RELEASE ROUND",
    title: "Read the land. Read the dates.",
    narration:
      "The map now shows hectares handed to producers in February 2020. The advertised figures belong to October 2020. These are separate rounds: dividing one by the other would not give a valid completion rate.",
    figure: "Feb ≠ Oct",
    figureLabel: "Two separate reporting periods",
    reading:
      "A dash means a figure is not recorded in this reference. It does not mean no land was released.",
    metric: "released",
    province: null,
  },
  {
    id: "landscape",
    label: "Find the fit",
    period: "LIMPOPO · FARMING SYSTEMS",
    title: "Follow the landscape, find your fit.",
    narration: PROVINCES.LP.systems,
    figure: PROVINCES.LP.commodities.slice(0, 3).join(" · "),
    figureLabel: "Part of the provincial farming profile",
    reading:
      "The active measure shows the state-owned share of registered provincial land, not crop suitability. Confirm conditions for an individual farm.",
    metric: "share",
    province: "LP",
  },
  {
    id: "route",
    label: "Your next step",
    period: "FROM EXPLORATION TO PREPARATION",
    title: "From a piece of land to a farming life.",
    narration:
      "Start with where you want to farm, the scale of your operation, how you will apply and your employment situation. Your answers assemble a route through the reference: category, lease framework, finance, documents and the office to contact.",
    figure: "4 questions",
    figureLabel: "One personalised starting point",
    reading:
      "The route planner helps you prepare. The department confirms eligibility, current notices and the terms of a particular offer.",
    metric: "advertised",
    province: null,
  },
];

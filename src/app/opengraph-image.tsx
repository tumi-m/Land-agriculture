import { FARM_NOTICES, NOTICE_CHECKED } from "@/content/farm-notices";
import { shortDate } from "@/lib/format";
import { DISTRICTS, PROVINCE_SHAPES } from "@/lib/geo";
import { SHARE_SIZE, shareCard } from "./share-card";

export const alt =
  "Asbonge Land Locator: open the land. Where South Africa’s state farmland is, what it is like, and how to apply for it.";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default function Image() {
  return shareCard({
    headline: "Open the land.",
    subtitle: "Where South Africa’s state farmland is, what it is like, and how to apply for it.",
    figures: [
      `${PROVINCE_SHAPES.length} provinces`,
      `${DISTRICTS.length} districts`,
      `${FARM_NOTICES.length} lease notices reviewed`,
    ],
    source: `DLRRD 2026 state farm lease adverts, reviewed ${shortDate(NOTICE_CHECKED)}`,
  });
}

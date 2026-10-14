import { CONTENT_REVIEWED } from "@/content/meta";
import { STAGES, TOTAL_DAYS } from "@/content/process";
import { shortDate } from "@/lib/format";
import { SHARE_SIZE, shareCard } from "../share-card";

export const alt = `How to apply for state farmland in South Africa: about ${TOTAL_DAYS} days from the closing day to a signed lease.`;
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default function Image() {
  return shareCard({
    headline: "Apply for state farmland.",
    subtitle: "The form, the committees it passes through, and the funding routes that follow.",
    figures: [`${STAGES.length} stages`, `about ${TOTAL_DAYS} days to a signed lease`],
    source: `Approximate stage durations from state land lease policy, reviewed ${shortDate(CONTENT_REVIEWED)}`,
  });
}

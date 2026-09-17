import { test, expect } from "@playwright/test";
import {
  applicationPayload,
  type RoundReceipt,
} from "../src/lib/adjudication/verify";
import { inclusionPath, leafHash, merkleRoot } from "../src/lib/adjudication/merkle";
import {
  adjudicate,
  rubricCommitment,
  type Rubric,
  type ScoreSet,
} from "../src/lib/adjudication/rubric";

/** The same generated vector the unit tests use: three applications under
 *  one rubric, committed and tallied with the scheme's own functions. It is
 *  a test vector, never sample data on the page. */
async function testVector(): Promise<RoundReceipt> {
  const rubric: Rubric = {
    name: "test-vector-r1",
    criteria: [
      { id: "land", weight: 3 },
      { id: "plan", weight: 2 },
    ],
  };
  const scenarioSet = { scenarios: ["irrigated", "dryland"] };
  const saltR = "test-vector-salt-r";
  const commitment = await rubricCommitment(rubric, scenarioSet, saltR);
  const applications = [
    { salt: "salt-a", digest: { id: "A" }, scores: { land: 10, plan: 5 } },
    { salt: "salt-b", digest: { id: "B" }, scores: { land: 8, plan: 9 } },
    { salt: "salt-c", digest: { id: "C" }, scores: { land: 9, plan: 6 } },
  ];
  const payloads = applications.map((application) =>
    applicationPayload(application.salt, application.digest),
  );
  const leaves: string[] = [];
  for (const payload of payloads) leaves.push(await leafHash(payload));
  const scores: ScoreSet[] = applications.map((application, index) => ({
    leaf: leaves[index],
    scores: application.scores,
  }));
  const verdict = adjudicate(rubric, scores);
  const totals: Record<string, number> = {};
  for (const row of verdict) totals[row.leaf] = row.total;
  return {
    version: 1,
    round: "test-vector-1",
    commitment,
    root: await merkleRoot(payloads),
    size: applications.length,
    application: {
      salt: applications[0].salt,
      digest: applications[0].digest,
      path: await inclusionPath(payloads, 0),
    },
    release: {
      rubric,
      scenarioSet,
      saltR,
      scores,
      order: verdict.map((row) => row.leaf),
      totals,
    },
  };
}

async function paste(page: import("@playwright/test").Page, receipt: unknown) {
  await page.getByLabel("Receipt (JSON)").fill(JSON.stringify(receipt));
  await page.getByRole("button", { name: "Check this receipt" }).click();
}

test("an empty log shows the empty state and never a sample round", async ({
  page,
}) => {
  await page.goto("/verify");
  await expect(
    page.getByRole("heading", { level: 1, name: /check the tally/i }),
  ).toBeVisible();
  await expect(page.getByText("No round has been published yet.")).toBeVisible();
  // A sample round would be invented data; the empty state is the design.
  await expect(page.getByText("test-vector")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Check this receipt" }),
  ).toBeVisible();
});

test("a test-vector receipt passes all three checks", async ({ page }) => {
  const receipt = await testVector();
  await page.goto("/verify");
  await paste(page, receipt);
  await expect(
    page.getByRole("heading", { name: "This receipt checks out." }),
  ).toBeVisible();
  await expect(page.getByText("3 of 3 checks passed")).toBeVisible();
  await expect(page.getByText("Passed", { exact: true })).toHaveCount(3);
  await expect(
    page.getByText(
      "The ranking re-derived from the published scores, best first",
    ),
  ).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Rank" })).toBeVisible();
});

test("a tampered receipt fails loudly with its reason", async ({ page }) => {
  const receipt = await testVector();
  receipt.release.totals[receipt.release.order[1]] += 1;
  await page.goto("/verify");
  await paste(page, receipt);
  await expect(
    page.getByRole("heading", { name: "This receipt does not check out." }),
  ).toBeVisible();
  await expect(page.getByText("2 of 3 checks passed")).toBeVisible();
  await expect(page.getByText("Failed", { exact: true })).toHaveCount(1);
  await expect(page.getByText("total-mismatch")).toBeVisible();
});

test("unreadable text is refused with a message a person can act on", async ({
  page,
}) => {
  await page.goto("/verify");
  await page.getByLabel("Receipt (JSON)").fill("hello");
  await page.getByRole("button", { name: "Check this receipt" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("not JSON");
  await expect(
    page.getByRole("heading", { name: "This receipt checks out." }),
  ).toHaveCount(0);
});

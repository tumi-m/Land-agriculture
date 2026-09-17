"use client";

/**
 * The /verify body: runs the three t4 statements on a pasted receipt, in the
 * browser, with nothing leaving the device. The page's honesty rules are the
 * record's (docs/inventions/01): an empty log is a designed state, every
 * failure names itself, and the last line always says what the check does not
 * prove.
 */
import { useEffect, useState } from "react";
import type { AdjudicationLog } from "@/lib/adjudication/log";
import {
  parseReceiptText,
  verifyReceipt,
  type ReceiptVerification,
  type StatementResult,
} from "@/lib/adjudication/verify";

type LogState =
  | { state: "loading" }
  | { state: "empty" }
  | { state: "published"; artefacts: number }
  | { state: "unreadable"; message: string };

function shortDigest(digest: string): string {
  return `${digest.slice(0, 10)}…${digest.slice(-6)}`;
}

function StatementRow({ statement }: { statement: StatementResult }) {
  return (
    <li className="border border-rule bg-raised p-4">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={`font-mono text-2xs uppercase tracking-[0.14em] ${
            statement.ok ? "text-ink" : "text-clay"
          }`}
        >
          {statement.ok ? "Passed" : "Failed"}
        </span>
        <span className="text-sm font-semibold text-ink">{statement.title}</span>
        {!statement.ok && statement.reason !== undefined && (
          <span className="chip">{statement.reason}</span>
        )}
      </p>
      <p className="mt-2 max-w-reading text-sm leading-relaxed text-muted">
        {statement.detail}
      </p>
    </li>
  );
}

function FactsTable({ result }: { result: ReceiptVerification }) {
  const rows: [string, string][] = [
    ["Round", result.facts.round],
    ["Applied leaf", result.facts.leaf],
    ["Round root", result.facts.root],
    ["Leaves in the round", String(result.facts.size)],
    ["Inclusion path length", `${result.facts.pathLength} steps`],
    ["Committed R", result.facts.commitment],
    ["R re-derived from the published inputs", result.facts.derivedCommitment],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">
          The numbers behind this receipt, as checked above
        </caption>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-t border-rule">
              <th scope="row" className="py-2 pr-4 align-top font-normal text-muted">
                {label}
              </th>
              <td className="num break-all py-2 text-ink">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RankingTable({ result }: { result: ReceiptVerification }) {
  if (result.verdict.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="pb-2 text-left text-sm text-muted">
          The ranking re-derived from the published scores, best first
        </caption>
        <thead>
          <tr className="border-b border-rule">
            <th scope="col" className="py-2 pr-4 font-mono text-2xs uppercase tracking-[0.14em] text-muted">
              Rank
            </th>
            <th scope="col" className="py-2 pr-4 font-mono text-2xs uppercase tracking-[0.14em] text-muted">
              Leaf
            </th>
            <th scope="col" className="py-2 font-mono text-2xs uppercase tracking-[0.14em] text-muted">
              Weighted total
            </th>
            <th scope="col" className="py-2 font-mono text-2xs uppercase tracking-[0.14em] text-muted">
              Total published
            </th>
          </tr>
        </thead>
        <tbody>
          {result.verdict.map((row) => {
            const published = result.publishedTotals[row.leaf];
            return (
              <tr key={row.leaf} className="border-t border-rule">
                <td className="num py-2 pr-4 text-ink">{row.rank + 1}</td>
                <td className="num py-2 pr-4 text-ink" title={row.leaf}>
                  {shortDigest(row.leaf)}
                </td>
                <td className="num py-2 text-ink">{row.total}</td>
                <td className="num py-2 text-ink">
                  {published === undefined ? "not published" : published}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ReceiptChecker() {
  const [log, setLog] = useState<LogState>({ state: "loading" });
  const [text, setText] = useState("");
  const [result, setResult] = useState<ReceiptVerification | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/adjudication/log.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`the log could not be fetched (${response.status})`);
        }
        return response.json() as Promise<AdjudicationLog>;
      })
      .then((parsed) => {
        if (cancelled) return;
        setLog(
          parsed.entries.length === 0
            ? { state: "empty" }
            : { state: "published", artefacts: parsed.entries.length },
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLog({
          state: "unreadable",
          message: error instanceof Error ? error.message : String(error),
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function check() {
    const parsed = parseReceiptText(text);
    if (!parsed.ok) {
      setResult(null);
      setParseError(parsed.message);
      return;
    }
    setParseError(null);
    setResult(await verifyReceipt(parsed.receipt));
  }

  const passed = result?.statements.filter((s) => s.ok).length ?? 0;
  const total = result?.statements.length ?? 0;

  return (
    <div className="stack" style={{ ["--stack" as string]: "2.5rem" }}>
      <section aria-labelledby="log-heading">
        <div className="opener">
          <h2 id="log-heading" className="font-display text-opener leading-none text-ink">
            The published log
          </h2>
        </div>
        <div className="mt-5">
          {log.state === "loading" && (
            <p className="text-sm text-muted">Reading the published log…</p>
          )}
          {log.state === "empty" && (
            <div className="border border-rule bg-raised p-5">
              <p className="text-sm font-semibold text-ink">
                No round has been published yet.
              </p>
              <p className="mt-2 max-w-reading text-sm leading-relaxed text-muted">
                When a real adjudication round is published, its artefacts and
                signed heads appear here, and receipts check against them.
                Until then this page stays empty: sample data is never added.
              </p>
            </div>
          )}
          {log.state === "published" && (
            <p className="max-w-reading text-sm leading-relaxed text-muted">
              The published log holds{" "}
              <span className="num">{log.artefacts}</span>{" "}
              {log.artefacts === 1 ? "artefact" : "artefacts"}. A receipt still
              carries its own copies; the three checks below run on the receipt
              you hold.
            </p>
          )}
          {log.state === "unreadable" && (
            <p className="max-w-reading text-sm leading-relaxed text-muted">
              The published log cannot be read right now: {log.message}. You can
              still check a receipt you hold.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="check-heading">
        <div className="opener">
          <h2 id="check-heading" className="font-display text-opener leading-none text-ink">
            Check a receipt
          </h2>
        </div>
        <p className="mt-5 max-w-reading text-sm leading-relaxed text-muted">
          Paste the receipt you received when your application was adjudicated.
          The three checks run in this browser: your receipt and its numbers are
          never sent anywhere.
        </p>
        <label htmlFor="receipt" className="eyebrow mt-6 block">
          Receipt (JSON)
        </label>
        <textarea
          id="receipt"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={8}
          spellCheck={false}
          className="mt-2 w-full border border-rule bg-raised p-3 font-mono text-xs text-ink"
          placeholder='{"version": 1, "round": "…"}'
        />
        <button
          type="button"
          onClick={() => {
            void check();
          }}
          disabled={text.trim() === ""}
          className="btn-solid mt-3 min-h-[44px]"
        >
          Check this receipt
        </button>
        {parseError !== null && (
          <p role="alert" className="mt-4 max-w-reading text-sm leading-relaxed text-clay">
            {parseError}
          </p>
        )}
      </section>

      {result !== null && (
        <section aria-labelledby="result-heading" aria-live="polite">
          <div className="opener">
            <h2 id="result-heading" className="font-display text-opener leading-none text-ink">
              {result.ok ? "This receipt checks out." : "This receipt does not check out."}
            </h2>
          </div>
          <p className="mt-5 text-sm text-muted">
            <span className="num">{passed}</span> of{" "}
            <span className="num">{total}</span> checks passed.
          </p>
          <ul className="mt-5 stack" style={{ ["--stack" as string]: "0.75rem" }}>
            {result.statements.map((statement) => (
              <StatementRow key={statement.id} statement={statement} />
            ))}
          </ul>
          <div className="mt-8">
            <FactsTable result={result} />
          </div>
          <div className="mt-8">
            <RankingTable result={result} />
          </div>
        </section>
      )}

      <section aria-labelledby="limits-heading" className="border-t-2 border-ink pt-4">
        <h2 id="limits-heading" className="eyebrow">
          What this does not prove
        </h2>
        <p className="mt-2 max-w-reading text-sm leading-relaxed text-muted">
          Three checks compare the numbers a receipt carries. They do not prove
          who typed a score: the entry of a score by a human is not proved by
          this scheme. What they give is attribution, immutability and public
          re-derivation of the tally — a receipt that anyone can check, so the
          humans who decide can be held to their own published rules.
        </p>
      </section>
    </div>
  );
}

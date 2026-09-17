import type { Metadata } from "next";
import Link from "next/link";
import ReceiptChecker from "./ReceiptChecker";

export const metadata: Metadata = {
  title: "Verify a receipt | Asbonge Land Locator",
  description:
    "Check a state land adjudication receipt in your browser: the rubric was committed before applications, the application was in the adjudicated set, and the ranking re-derives from the published scores.",
};

export default function VerifyPage() {
  return (
    <div className="relative z-[1]">
      <header className="app-header">
        <Link className="brand" href="/" aria-label="Asbonge Land Locator home">
          <span className="brand-mark" aria-hidden="true">
            A<span>↗</span>
          </span>
          <span>
            asbonge<span className="brand-sub">LAND &amp; OPPORTUNITY</span>
          </span>
        </Link>
        <nav aria-label="Main navigation" className="main-nav">
          <Link href="/">Explore land</Link>
          <Link href="/guide">Guide</Link>
          <a href="/verify" className="nav-current" aria-current="page">
            Verify
          </a>
        </nav>
      </header>

      <main className="mx-auto max-w-[96rem] px-4 pb-20 pt-10 lg:px-6">
        <p className="eyebrow">Verifiable adjudication</p>
        <h1 className="mt-2 max-w-reading font-display text-opener leading-tight text-ink">
          Anyone can check the tally.
        </h1>
        <p className="lede mt-4">
          State land allocation has been captured before: connected applicants
          ahead of farm workers and smallholders, with no open points-based
          adjudication and often no reasons. This page is the receipt check
          that makes a published round auditable — the rubric, the set of
          applications and the ranking, not the word of whoever ran it.
        </p>
        <div className="mt-10">
          <ReceiptChecker />
        </div>
      </main>

      <footer className="border-t border-ink">
        <div className="mx-auto max-w-[96rem] px-4 py-7 lg:px-6">
          <p className="max-w-reading text-sm leading-relaxed text-muted">
            The checking scheme is documented in the repository&apos;s invention
            record: RFC 6962-style Merkle trees, SHA-256, Ed25519 signed heads.
            Every check runs in your browser; nothing leaves this device.
          </p>
          <p className="eyebrow mt-4">
            A receipt is evidence, not a decision · nothing here is an offer
          </p>
        </div>
      </footer>
    </div>
  );
}

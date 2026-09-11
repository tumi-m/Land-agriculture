import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  CaseStudies,
  CategoryTable,
  Directory,
  FinanceSection,
  PolicySection,
  ProcessSection,
  RiskSection,
  WhoHandlesWhat,
} from "@/components/Sections";
import { CONTENT_REVIEWED, SOURCE_NOTE } from "@/content/meta";
import { PathfinderPanel, RankingPanel } from "./panels";

export const metadata: Metadata = {
  title: "Application guide | Asbonge Land Locator",
  description:
    "How to apply for state agricultural land in South Africa: your route, the application process, money and finance, history, what goes wrong, and offices.",
};

/** The reference that used to sit under the map, as anchored sections. */
const SECTIONS: { id: string; n: string; label: string }[] = [
  { id: "route", n: "01", label: "Your route" },
  { id: "applying", n: "02", label: "Applying" },
  { id: "money", n: "03", label: "Money" },
  { id: "history", n: "04", label: "History" },
  { id: "reality", n: "05", label: "Reality" },
  { id: "offices", n: "06", label: "Offices" },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="opener">
        <h2 className="font-display text-opener leading-none text-ink">
          {title}
        </h2>
      </div>
      <div className="mt-7">{children}</div>
    </section>
  );
}

export default function GuidePage() {
  return (
    <div className="relative z-[1] terrain-experience">
      <header className="app-header">
        <Link className="brand" href="/" aria-label="Asbonge Land Locator home">
          <span className="brand-mark" aria-hidden="true">
            A<span>↗</span>
          </span>
          <span>
            asbonge<span className="brand-sub">LAND & OPPORTUNITY</span>
          </span>
        </Link>
        <nav aria-label="Main navigation" className="main-nav">
          <Link href="/">Explore land</Link>
          <a href="/guide" className="nav-current" aria-current="page">
            Guide
          </a>
        </nav>
      </header>

      <div className="sticky top-[4.5rem] z-30 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto max-w-[96rem] overflow-x-auto px-4 lg:px-6">
          <nav
            aria-label="Guide sections"
            className="flex gap-1 whitespace-nowrap py-1"
          >
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-baseline gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted transition-colors hover:text-ink"
              >
                <span className="num text-2xs text-faint">{s.n}</span>
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-[96rem] space-y-20 px-4 pb-20 pt-10 lg:px-6">
        <Section id="route" title="Which category are you?">
          <Suspense>
            <PathfinderPanel />
          </Suspense>
        </Section>

        <Section id="applying" title="Applying">
          <WhoHandlesWhat />
          <div className="mt-10">
            <ProcessSection />
          </div>
          <div className="mt-12">
            <h3 className="font-display text-opener leading-tight text-ink">
              The four categories
            </h3>
            <div className="mt-4">
              <CategoryTable />
            </div>
          </div>
        </Section>

        <Section id="money" title="Money">
          <FinanceSection />
        </Section>

        <Section id="history" title="History">
          <PolicySection />
          <div className="mt-12">
            <h3 className="font-display text-opener leading-tight text-ink">
              What has worked
            </h3>
            <div className="mt-5">
              <CaseStudies />
            </div>
          </div>
        </Section>

        <Section id="reality" title="What goes wrong">
          <RiskSection />
        </Section>

        <Section id="offices" title="Offices">
          <Directory />
          <div className="mt-12">
            <h3 className="font-display text-opener leading-tight text-ink">
              Hectares by province
            </h3>
            <div className="mt-4">
              <RankingPanel />
            </div>
          </div>
        </Section>
      </main>

      <footer className="border-t border-ink">
        <div className="mx-auto max-w-[96rem] px-4 py-7 lg:px-6">
          <p className="max-w-reading text-sm leading-relaxed text-muted">
            {SOURCE_NOTE}
          </p>
          <p className="eyebrow mt-4">
            Reviewed {CONTENT_REVIEWED} · nothing here is an offer
          </p>
        </div>
      </footer>
    </div>
  );
}

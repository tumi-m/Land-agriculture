import type { Metadata } from "next";
import Link from "next/link";
import Outline from "@/components/Outline";
import { CONTENT_REVIEWED, SOURCE_NOTE } from "@/content/meta";

export const metadata: Metadata = {
  title: "Outline | Asbonge Land Locator",
  description:
    "Every South African province and district as text: area, rainfall, soil pH, main land cover and the reviewed state farm lease notices, each with its source and date.",
};

export default function OutlinePage() {
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
          <Link href="/guide">Guide</Link>
          <a href="/outline" className="nav-current" aria-current="page">
            Outline
          </a>
        </nav>
      </header>
      <main className="mx-auto max-w-[96rem] px-4 pb-20 pt-10 lg:px-6">
        <h1 className="font-display text-opener leading-none text-ink">The land, as text</h1>
        <Outline />
      </main>
      <footer className="border-t border-ink">
        <div className="mx-auto max-w-[96rem] px-4 py-7 lg:px-6">
          <p className="max-w-reading text-sm leading-relaxed text-muted">{SOURCE_NOTE}</p>
          <p className="eyebrow mt-4">Reviewed {CONTENT_REVIEWED} · nothing here is an offer</p>
        </div>
      </footer>
    </div>
  );
}

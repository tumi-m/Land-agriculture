"use client";

import { useEffect, useState } from "react";

/**
 * The guide's section links, with the section being read marked. On a long
 * page the bar is the only map of where you are; without it every link looked
 * the same wherever you had scrolled to.
 */
export default function SectionNav({
  sections,
}: {
  sections: { id: string; n: string; label: string }[];
}) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const nodes = sections
      .map((s) => document.getElementById(s.id))
      .filter((n): n is HTMLElement => n !== null);
    // A section is current while its top is in the upper part of the
    // viewport, under the sticky bars.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      { rootMargin: "-25% 0px -60% 0px" },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [sections]);

  // On a phone the bar scrolls sideways; keep the current section in it.
  useEffect(() => {
    if (!current) return;
    const link = document.querySelector<HTMLElement>(
      `.guide-sections a[href="#${current}"]`,
    );
    link?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [current]);

  return (
    <nav
      aria-label="Guide sections"
      className="guide-sections flex gap-1 whitespace-nowrap py-1"
    >
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          aria-current={current === s.id ? "location" : undefined}
          className="flex min-h-[44px] items-center gap-2 border-b-2 border-transparent px-3 text-sm text-muted transition-colors hover:text-ink"
        >
          <span className="num text-2xs text-faint">{s.n}</span>
          {s.label}
        </a>
      ))}
    </nav>
  );
}

"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { IconClose, IconSearch } from "@/components/ui/icons";
import { emptyMessage, search, type SearchHit } from "@/lib/search";

/**
 * Find a province, district or lease notice by name or use, or paste a
 * Surveyor-General code or coordinates. A modal dialog, so focus stays in
 * it; type, move with the arrow keys, open with Enter, leave with Escape.
 */
export default function SearchDialog({
  open,
  onClose,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  onChoose: (hit: SearchHit) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const hits = useMemo(() => search(query), [query]);
  const listId = useId();
  const optionId = (i: number) => `${listId}-${i}`;

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      setQuery("");
      setActive(0);
      el.showModal();
    } else if (!open && el.open) el.close();
  }, [open]);

  const choose = (hit: SearchHit | undefined) => {
    if (!hit) return;
    onChoose(hit);
    onClose();
  };

  return (
    <dialog
      ref={dialog}
      className="search-dialog"
      aria-label="Search places and lease notices"
      onClose={onClose}
      onClick={(event) => {
        // A press on the backdrop, outside the panel, closes it.
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className="search-panel">
        <div className="search-field">
          <IconSearch />
          <input
            type="search"
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls={listId}
            aria-activedescendant={hits.length ? optionId(active) : undefined}
            aria-autocomplete="list"
            aria-label="Place, farm, use, Surveyor-General code or coordinates"
            placeholder="Vhembe, dairy, a farm's name, -23.84, 30.35…"
            value={query}
            autoFocus
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(hits.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                choose(hits[active]);
              }
            }}
          />
          <button type="button" className="search-close" aria-label="Close search" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <ul id={listId} role="listbox" aria-label="Results" className="search-results">
          {hits.map((hit, i) => (
            <li
              key={`${hit.kind}:${hit.label}:${i}`}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(hit)}
            >
              <b>{hit.label}</b>
              <small>{hit.detail}</small>
            </li>
          ))}
        </ul>
        <p className="search-status" role="status">
          {!query.trim()
            ? "Search provinces, districts and the reviewed lease notices. Nothing you type leaves this device."
            : hits.length
              ? `${hits.length} ${hits.length === 1 ? "result" : "results"}. Arrow keys to move, Enter to open.`
              : emptyMessage(query)}
        </p>
      </div>
    </dialog>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import type { BranchInfo } from "../types";

/** Every whitespace-separated term must appear in the name, case-insensitively,
 *  so "econ mtls" finds "NO-CARD/feature/econnect-mtls". */
export function filterBranches(branches: BranchInfo[], query: string): BranchInfo[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return branches;
  return branches.filter((b) => {
    const name = b.name.toLowerCase();
    return terms.every((t) => name.includes(t));
  });
}

/** Branch list for the source/target dropdowns, with a type-to-filter box.
 *  Arrow keys move the highlight, Enter picks it, Escape closes. */
export function BranchDropdownList({
  branches,
  selected,
  onSelect,
  onClose,
}: {
  branches: BranchInfo[];
  selected: string | null;
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const filtered = useMemo(() => filterBranches(branches, query), [branches, query]);

  // A new query restarts the highlight at the best (first) match.
  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector(".branch-option.active")
      ?.scrollIntoView({ block: "nearest" });
  }, [active, filtered]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[active];
      if (pick) onSelect(pick.name);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <ul className="branch-dropdown" ref={listRef}>
      {branches.length > 0 && (
        <li className="branch-filter">
          <input
            className="branch-filter-input"
            type="text"
            placeholder={`Filter ${branches.length} branches…`}
            value={query}
            autoFocus
            spellCheck={false}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </li>
      )}
      {filtered.map((b, i) => (
        <li
          key={b.name}
          className={`branch-option ${b.name === selected ? "selected" : ""} ${b.is_current ? "current" : ""} ${i === active ? "active" : ""}`}
          onMouseEnter={() => setActive(i)}
          onClick={() => onSelect(b.name)}
        >
          <span className="branch-option-name">{b.name}</span>
          {b.is_current && <span className="branch-current-badge">current</span>}
          {b.has_upstream && <span className="branch-upstream-badge">tracked</span>}
        </li>
      ))}
      {branches.length === 0 && <li className="branch-option disabled">No branches found</li>}
      {branches.length > 0 && filtered.length === 0 && (
        <li className="branch-option disabled">No branches match “{query.trim()}”</li>
      )}
    </ul>
  );
}

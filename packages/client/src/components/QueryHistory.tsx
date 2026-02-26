import { useEffect, useRef } from "react";
import type { QueryHistoryEntry } from "../hooks/useQueryHistory";

interface QueryHistoryProps {
  history: QueryHistoryEntry[];
  open: boolean;
  onSelect: (query: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function firstLine(query: string): string {
  const line = query.split("\n").find((l) => l.trim() !== "") ?? query;
  return line.length > 60 ? line.slice(0, 60) + "…" : line;
}

export function QueryHistory({ history, open, onSelect, onDelete, onClear, onClose }: QueryHistoryProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus close button when panel opens; close on Escape
  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-out panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-label="Query history"
        aria-hidden={!open}
        className={`fixed top-0 right-0 z-50 flex h-full w-80 flex-col border-l border-(--color-border) bg-(--color-surface) shadow-lg transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-(--color-border) px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-(--color-text-secondary)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <h2 className="text-sm font-medium text-(--color-text)">
              History ({history.length})
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {history.length > 0 && (
              <button
                onClick={onClear}
                className="rounded px-2 py-1 text-xs text-(--color-text-secondary) transition-colors hover:bg-(--color-surface-alt) hover:text-(--color-error)"
              >
                Clear All
              </button>
            )}
            <button
              ref={closeRef}
              onClick={onClose}
              className="rounded-lg p-1.5 text-(--color-text-secondary) transition-colors hover:bg-(--color-surface-alt)"
              aria-label="Close history panel"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Entry list */}
        <ul className="flex-1 overflow-y-auto" role="list" aria-label="Query history entries">
          {history.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-(--color-text-secondary)">
              No queries yet. Run a query to see it here.
            </li>
          ) : (
            history.map((entry) => (
              <li
                key={entry.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(entry.query)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(entry.query);
                  }
                }}
                className="group flex cursor-pointer items-start gap-3 border-b border-(--color-border) px-4 py-3 transition-colors hover:bg-(--color-surface-alt) focus-visible:bg-(--color-surface-alt) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--color-primary)"
                aria-label={`${entry.status === "success" ? "Successful" : "Failed"} query: ${firstLine(entry.query)}, ${relativeTime(entry.timestamp)}`}
              >
                {/* Status dot */}
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: entry.status === "success" ? "var(--color-success)" : "var(--color-error)",
                  }}
                  aria-hidden="true"
                />

                {/* Query + metadata */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-(--color-text)">
                    {firstLine(entry.query)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-(--color-text-secondary)">
                    <span>{relativeTime(entry.timestamp)}</span>
                    {entry.duration != null && <span>{entry.duration}ms</span>}
                    {entry.rowCount != null && (
                      <span>
                        {entry.rowCount} row{entry.rowCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {entry.errorMessage && (
                      <span className="truncate text-(--color-error)">{entry.errorMessage}</span>
                    )}
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(entry.id);
                  }}
                  className="shrink-0 rounded p-0.5 text-(--color-text-secondary) opacity-0 transition-opacity hover:text-(--color-error) group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary)"
                  aria-label={`Delete query: ${firstLine(entry.query)}`}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>
    </>
  );
}

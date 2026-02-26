import { useState, useRef, useEffect, useCallback } from "react";
import { QueryEditor } from "./components/QueryEditor";
import { QueryHistory } from "./components/QueryHistory";
import { ResultsView } from "./components/ResultsView";
import { useQuery } from "./hooks/useQuery";
import { useQueryHistory } from "./hooks/useQueryHistory";
import { useDarkMode } from "./hooks/useDarkMode";

export default function App() {
  const { data, error, loading, runningQuery, run } = useQuery();
  const { dark, toggle } = useDarkMode();
  const { history, addEntry, deleteEntry, clearHistory } = useQueryHistory();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [externalQuery, setExternalQuery] = useState<{ text: string; token: number } | undefined>();

  const [profile, setProfile] = useState<string | null>(null);

  const editorQueryRef = useRef("");
  const executionTimestampRef = useRef<number | null>(null);
  const prevLoadingRef = useRef(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setProfile(d.profile ?? null))
      .catch(() => {});
  }, []);

  const handleRun = useCallback(
    (query: string) => {
      executionTimestampRef.current = Date.now();
      run(query);
    },
    [run],
  );

  const handleQueryChange = useCallback((query: string) => {
    editorQueryRef.current = query;
  }, []);

  // Record history entry when loading transitions from true → false
  useEffect(() => {
    if (prevLoadingRef.current && !loading) {
      const timestamp = executionTimestampRef.current ?? Date.now();
      const duration = Date.now() - timestamp;
      const query = runningQuery ?? editorQueryRef.current;

      if (query) {
        addEntry({
          query,
          timestamp,
          duration,
          rowCount: data ? (data.results?.length ?? null) : null,
          status: error ? "error" : "success",
          errorMessage: error ?? null,
        });
      }

      executionTimestampRef.current = null;
    }
    prevLoadingRef.current = loading;
  }, [loading, data, error, runningQuery, addEntry]);

  const handleHistorySelect = useCallback((query: string) => {
    setExternalQuery({ text: query, token: Date.now() });
    setHistoryOpen(false);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-(--color-border) border-b bg-(--color-surface) px-5 py-3">
        <div className="flex items-center gap-2.5">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 2h6v5l4 7.5c.7 1.3-.1 2.5-1.5 2.5h-11C5.1 17 4.3 15.8 5 14.5L9 7V2z" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="8" y1="2" x2="16" y2="2" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M6.5 13L9 8.5h6L17.5 13c.5 1-.1 1.5-1 1.5H7.5c-.9 0-1.5-.5-1-1.5z" fill="var(--color-primary)" opacity="0.2" />
            <circle cx="10" cy="11" r="1.2" fill="var(--color-primary)" />
            <circle cx="14" cy="11" r="1.2" fill="var(--color-primary)" />
            <circle cx="12" cy="14" r="1.2" fill="var(--color-primary)" />
            <line x1="10" y1="11" x2="14" y2="11" stroke="var(--color-primary)" strokeWidth="0.8" opacity="0.6" />
            <line x1="10" y1="11" x2="12" y2="14" stroke="var(--color-primary)" strokeWidth="0.8" opacity="0.6" />
            <line x1="14" y1="11" x2="12" y2="14" stroke="var(--color-primary)" strokeWidth="0.8" opacity="0.6" />
            <circle cx="9" cy="15" r="0.5" fill="var(--color-primary)" opacity="0.4" />
            <circle cx="15" cy="14.5" r="0.4" fill="var(--color-primary)" opacity="0.3" />
          </svg>
          <h1 className="font-semibold text-(--color-text) text-lg">Graph DB Lab</h1>
          {profile && (
            <span className="rounded-full bg-(--color-primary)/15 px-2.5 py-0.5 text-xs font-medium text-(--color-primary)">
              {profile}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* History button */}
          <button
            onClick={() => setHistoryOpen(true)}
            className="relative rounded-lg p-2 text-(--color-text-secondary) transition-colors hover:bg-(--color-surface-alt)"
            aria-label={history.length > 0 ? `Query history (${history.length})` : "Query history"}
            title="Query history"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {history.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--color-primary) px-1 text-[10px] font-medium text-white" aria-hidden="true">
                {history.length}
              </span>
            )}
          </button>
          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="rounded-lg p-2 text-(--color-text-secondary) transition-colors hover:bg-(--color-surface-alt)"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        <QueryEditor
          onRun={handleRun}
          loading={loading}
          onQueryChange={handleQueryChange}
          externalQuery={externalQuery}
        />
        <ResultsView data={data} error={error} loading={loading} query={runningQuery} />
      </div>

      {/* History side panel */}
      <QueryHistory
        history={history}
        open={historyOpen}
        onSelect={handleHistorySelect}
        onDelete={deleteEntry}
        onClear={clearHistory}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  );
}

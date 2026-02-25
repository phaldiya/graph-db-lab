import { useState, useEffect, useCallback } from "react";

export interface QueryHistoryEntry {
  id: string;
  query: string;
  timestamp: number;
  duration: number | null;
  rowCount: number | null;
  status: "success" | "error";
  errorMessage: string | null;
}

const STORAGE_KEY = "query-history";
const MAX_ENTRIES = 50;

function loadHistory(): QueryHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueryHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function useQueryHistory() {
  const [history, setHistory] = useState<QueryHistoryEntry[]>(loadHistory);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const addEntry = useCallback(
    (entry: Omit<QueryHistoryEntry, "id">) => {
      setHistory((prev) => {
        // Skip if the most recent entry has the same query text
        if (prev.length > 0 && prev[0].query === entry.query) {
          return prev;
        }
        const next = [{ ...entry, id: crypto.randomUUID() }, ...prev];
        return next.slice(0, MAX_ENTRIES);
      });
    },
    [],
  );

  const deleteEntry = useCallback((id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, addEntry, deleteEntry, clearHistory };
}

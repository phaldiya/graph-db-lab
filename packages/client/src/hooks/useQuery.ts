import { useState, useCallback, useRef } from "react";

interface QueryResult {
  results: unknown[];
  duration: number;
}

interface QueryError {
  error: { message: string; code: string };
}

interface UseQueryReturn {
  data: QueryResult | null;
  error: string | null;
  loading: boolean;
  runningQuery: string | null;
  run: (query: string, parameters?: Record<string, unknown>) => Promise<void>;
}

export function useQuery(): UseQueryReturn {
  const [data, setData] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningQuery, setRunningQuery] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (query: string, parameters: Record<string, unknown> = {}) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setData(null);
    setRunningQuery(query);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, parameters }),
        signal: controller.signal,
      });

      const json = await res.json();

      if (!res.ok) {
        const errBody = json as QueryError;
        setError(errBody.error?.message ?? `Request failed with status ${res.status}`);
      } else {
        setData(json as QueryResult);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, error, loading, runningQuery, run };
}

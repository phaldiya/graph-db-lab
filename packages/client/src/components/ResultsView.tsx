import { useCallback, useEffect, useMemo, useState } from "react";

type SortDir = "asc" | "desc";

interface ResultsViewProps {
  data: { results: unknown[]; duration: number } | null;
  error: string | null;
  loading: boolean;
  query: string | null;
}

interface NeptuneNode {
  "~id": string;
  "~entityType": string;
  "~labels": string[];
  "~properties": Record<string, unknown>;
}

export function ResultsView({ data, error, loading, query }: ResultsViewProps) {
  const { columns, rows } = data ? flattenResults(data.results) : { columns: [], rows: [] };

  const [sort, setSort] = useState<{ col: string | null; dir: SortDir }>({ col: null, dir: "asc" });

  // Reset client sort when results change
  useEffect(() => {
    setSort({ col: null, dir: "asc" });
  }, [data]);

  const querySort = useMemo(() => (query ? parseOrderBy(query, columns) : []), [query, columns]);

  const sortedRows = useMemo(() => {
    if (!sort.col) return rows;
    const { col, dir } = sort;
    return [...rows].sort((a, b) => {
      const av = a[col];
      const bv = b[col];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort]);

  const handleSort = useCallback((col: string) => {
    setSort((prev) => ({
      col,
      dir: prev.col === col ? (prev.dir === "asc" ? "desc" : "asc") : "asc",
    }));
  }, []);

  const downloadCsv = useCallback(() => {
    if (columns.length === 0 || rows.length === 0) return;
    const header = columns.map(escapeCsv).join(",");
    const body = rows.map((row) => columns.map((col) => escapeCsv(formatCell(row[col]))).join(",")).join("\n");
    download(`${header}\n${body}`, "results.csv", "text/csv");
  }, [columns, rows]);

  const downloadJson = useCallback(() => {
    if (!data) return;
    download(JSON.stringify(rows.length > 0 ? rows : data.results, null, 2), "results.json", "application/json");
  }, [data, rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="h-5 w-5 animate-spin text-(--color-primary)" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-(--color-error) bg-red-50 p-4 dark:bg-red-950">
        <p className="text-(--color-error) text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-hidden">
      {/* Stats + Download bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-(--color-text-secondary)">
            {data.results.length} row{data.results.length !== 1 ? "s" : ""}
          </span>
          <span className="text-(--color-text-secondary) opacity-50">&middot;</span>
          <span className="text-(--color-text-secondary)">{formatDuration(data.duration)}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={downloadCsv}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-(--color-text-secondary) text-xs transition-colors hover:bg-(--color-surface-alt) hover:text-(--color-text)"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            CSV
          </button>
          <button
            onClick={downloadJson}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-(--color-text-secondary) text-xs transition-colors hover:bg-(--color-surface-alt) hover:text-(--color-text)"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            JSON
          </button>
        </div>
      </div>

      {/* Table */}
      {columns.length > 0 ? (
        <div className="flex-1 overflow-auto rounded-lg border border-(--color-border)">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-(--color-border) border-b bg-(--color-border)/70">
                {columns.map((col) => {
                  const qs = querySort.find((s) => s.col === col);
                  const isClientSorted = sort.col === col;
                  return (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="cursor-pointer select-none whitespace-nowrap px-3 py-2 font-semibold text-(--color-text-secondary) text-xs uppercase tracking-wide transition-colors hover:text-(--color-text)"
                    >
                      <span className="inline-flex items-center gap-1">
                        {col}
                        {isClientSorted && <SortArrow dir={sort.dir} />}
                        {qs && !isClientSorted && <QuerySortBadge dir={qs.dir} index={qs.index} />}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-(--color-surface)">
              {sortedRows.map((row, i) => (
                <tr key={i} className={`border-(--color-border) border-b last:border-b-0 transition-colors hover:bg-(--color-surface-alt) ${i % 2 === 1 ? "bg-(--color-surface-alt)/50" : ""}`}>
                  {columns.map((col) => (
                    <td key={col} className="whitespace-nowrap px-3 py-2 font-mono text-(--color-text) text-xs">
                      {formatCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <pre className="flex-1 overflow-auto rounded-lg bg-(--color-surface-alt) p-3 font-mono text-(--color-text) text-sm">
          {JSON.stringify(data.results, null, 2)}
        </pre>
      )}
    </div>
  );
}

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function isNeptuneNode(value: unknown): value is NeptuneNode {
  return (
    typeof value === "object" &&
    value !== null &&
    "~id" in value &&
    "~labels" in value &&
    "~properties" in value
  );
}

function isNestedObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function flattenResults(results: unknown[]): { columns: string[]; rows: Record<string, unknown>[] } {
  if (results.length === 0) return { columns: [], rows: [] };

  const first = results[0];
  if (typeof first !== "object" || first === null || Array.isArray(first)) {
    return { columns: [], rows: [] };
  }

  const returnKeys = Object.keys(first);

  // Check if any return value is a nested object that needs flattening
  const hasNested = returnKeys.some((key) => {
    const v = (first as Record<string, unknown>)[key];
    return isNestedObject(v);
  });

  if (!hasNested) {
    return {
      columns: returnKeys,
      rows: results as Record<string, unknown>[],
    };
  }

  const rows: Record<string, unknown>[] = [];
  const columnSet = new Set<string>();

  for (const result of results) {
    const row: Record<string, unknown> = {};
    const obj = result as Record<string, unknown>;

    for (const key of returnKeys) {
      const value = obj[key];

      if (!isNestedObject(value)) {
        row[key] = value;
        columnSet.add(key);
        continue;
      }

      const prefix = returnKeys.length > 1 ? `${key}.` : "";

      if (isNeptuneNode(value)) {
        row[`${prefix}~id`] = value["~id"];
        columnSet.add(`${prefix}~id`);
        row[`${prefix}~labels`] = value["~labels"].join(", ");
        columnSet.add(`${prefix}~labels`);

        for (const [prop, propVal] of Object.entries(value["~properties"])) {
          row[`${prefix}${prop}`] = propVal;
          columnSet.add(`${prefix}${prop}`);
        }
      } else {
        // Plain nested object (e.g. map projection: nu{.id, .firstName})
        for (const [prop, propVal] of Object.entries(value)) {
          row[`${prefix}${prop}`] = propVal;
          columnSet.add(`${prefix}${prop}`);
        }
      }
    }

    rows.push(row);
  }

  const columns = [...columnSet].sort((a, b) => {
    const aIsMeta = a.endsWith("~id") || a.endsWith("~labels");
    const bIsMeta = b.endsWith("~id") || b.endsWith("~labels");
    if (aIsMeta && !bIsMeta) return -1;
    if (!aIsMeta && bIsMeta) return 1;
    return a.localeCompare(b);
  });

  return { columns, rows };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// --- Sort indicator components ---

function SortArrow({ dir }: { dir: SortDir }) {
  return (
    <svg className="h-3.5 w-3.5 text-(--color-primary)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {dir === "asc"
        ? <polyline points="6 15 12 9 18 15" />
        : <polyline points="6 9 12 15 18 9" />}
    </svg>
  );
}

function QuerySortBadge({ dir, index }: { dir: SortDir; index: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 opacity-50" title={`Query sorted ${dir === "asc" ? "ascending" : "descending"} (ORDER BY #${index + 1})`}>
      <svg className="h-3.5 w-3.5 text-(--color-text-secondary)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {dir === "asc"
          ? <polyline points="6 15 12 9 18 15" />
          : <polyline points="6 9 12 15 18 9" />}
      </svg>
      {index > 0 && <span className="font-mono text-[10px] text-(--color-text-secondary)">{index + 1}</span>}
    </span>
  );
}

// --- ORDER BY parser ---

interface QuerySortEntry { col: string; dir: SortDir; index: number }

function parseOrderBy(query: string, columns: string[]): QuerySortEntry[] {
  // Strip strings to avoid matching keywords inside them
  const stripped = query.replace(/(?:'[^']*'|"[^"]*")/g, "''");

  // Find the ORDER BY clause — grab everything after ORDER BY until next major keyword or end
  const match = stripped.match(/\bORDER\s+BY\s+([\s\S]+?)(?:\bLIMIT\b|\bSKIP\b|\bUNION\b|\bRETURN\b|$)/i);
  if (!match) return [];

  // Also extract RETURN aliases: RETURN expr AS alias
  const aliasMap = new Map<string, string>();
  const returnMatch = stripped.match(/\bRETURN\s+(?:DISTINCT\s+)?([\s\S]+?)(?:\bORDER\b|\bLIMIT\b|\bSKIP\b|\bUNION\b|\bWHERE\b|$)/i);
  if (returnMatch) {
    for (const part of returnMatch[1].split(",")) {
      const aliasM = part.trim().match(/^(.+?)\s+AS\s+(\w+)\s*$/i);
      if (aliasM) aliasMap.set(aliasM[2].trim(), aliasM[1].trim());
    }
  }

  const entries: QuerySortEntry[] = [];
  const parts = match[1].split(",");

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    const tokens = part.split(/\s+/);
    const expr = tokens[0];
    const dirToken = tokens[tokens.length - 1]?.toUpperCase();
    const dir: SortDir = dirToken === "DESC" || dirToken === "DESCENDING" ? "desc" : "asc";

    // Try to match expr to a column: exact match, or resolve alias
    const resolved = aliasMap.get(expr) ?? expr;
    const col = columns.find(
      (c) => c === expr || c === resolved || c.toLowerCase() === expr.toLowerCase() || c.toLowerCase() === resolved.toLowerCase(),
    );

    if (col) {
      entries.push({ col, dir, index: i });
    }
  }

  return entries;
}

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from "react";

interface QueryEditorProps {
  onRun: (query: string) => void;
  loading: boolean;
  onQueryChange?: (query: string) => void;
  externalQuery?: { text: string; token: number };
}

const DEFAULT_QUERY = "MATCH (n) RETURN n LIMIT 10";
const MOD_KEY = navigator.platform.includes("Mac") ? "\u2318" : "Ctrl";

// Keywords that start a new line (no indent), ordered longest-first for greedy matching
const MAJOR_KEYWORDS = [
  "OPTIONAL MATCH",
  "DETACH DELETE",
  "ORDER BY",
  "LOAD CSV",
  "MATCH",
  "RETURN",
  "WHERE",
  "CREATE",
  "MERGE",
  "SET",
  "DELETE",
  "REMOVE",
  "WITH",
  "UNWIND",
  "LIMIT",
  "SKIP",
  "UNION",
  "CALL",
  "YIELD",
];

// Sub-clause keywords that get indented (2 spaces) — per openCypher style guide
const SUB_KEYWORDS = ["AND", "OR", "ON MATCH", "ON CREATE"];

function beautifyQuery(query: string): string {
  return query
    .split("\n")
    .map((line) => {
      // Preserve comment lines untouched
      if (line.trimStart().startsWith("//")) return line;

      // Extract strings so keywords inside them aren't split
      const strings: string[] = [];
      const stripped = line.replace(/(?:'[^']*'|"[^"]*")/g, (m) => {
        strings.push(m);
        return `\x00S${strings.length - 1}\x00`;
      });

      // Collapse redundant whitespace and strip trailing semicolons
      let cleaned = stripped.replace(/\s+/g, " ").trim().replace(/;\s*$/, "");

      // Uppercase keywords (not preceded by . to avoid uppercasing property names)
      cleaned = cleaned.replace(/(?<![.])\b[A-Za-z]+\b/g, (word) =>
        KEYWORDS.has(word.toUpperCase()) ? word.toUpperCase() : word,
      );

      // Protect ON MATCH / ON CREATE from being split by MATCH/CREATE
      cleaned = cleaned.replace(/\bON\s+MATCH\b/g, "\x00ONMATCH\x00");
      cleaned = cleaned.replace(/\bON\s+CREATE\b/g, "\x00ONCREATE\x00");

      // Insert newlines before major keywords
      for (const kw of MAJOR_KEYWORDS) {
        const re = new RegExp(`(?<=\\S)\\s+(?=${kw.replace(/ /g, "\\s+")}\\b)`, "gi");
        cleaned = cleaned.replace(re, "\n");
      }

      // Insert newlines + indent before sub-clause keywords (AND, OR)
      for (const kw of SUB_KEYWORDS) {
        if (kw.startsWith("ON ")) continue; // handled via placeholders below
        const re = new RegExp(`(?<=\\S)\\s+(?=${kw}\\b)`, "gi");
        cleaned = cleaned.replace(re, "\n  ");
      }

      // Restore ON MATCH / ON CREATE with 2-space indent
      cleaned = cleaned.replace(/(?<=\S)\s*\x00ONMATCH\x00/g, "\n  ON MATCH");
      cleaned = cleaned.replace(/(?<=\S)\s*\x00ONCREATE\x00/g, "\n  ON CREATE");
      cleaned = cleaned.replace(/\x00ONMATCH\x00/g, "ON MATCH");
      cleaned = cleaned.replace(/\x00ONCREATE\x00/g, "ON CREATE");

      // Restore strings
      cleaned = cleaned.replace(/\x00S(\d+)\x00/g, (_, i) => strings[Number(i)]);

      // Trim trailing spaces on each resulting line
      return cleaned
        .split("\n")
        .map((l) => l.trimEnd())
        .join("\n");
    })
    .join("\n");
}

export function QueryEditor({ onRun, loading, onQueryChange, externalQuery }: QueryEditorProps) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateQuery = useCallback(
    (next: string | ((prev: string) => string)) => {
      setQuery((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        onQueryChange?.(value);
        return value;
      });
    },
    [onQueryChange],
  );

  useEffect(() => {
    if (externalQuery) {
      updateQuery(externalQuery.text);
    }
    // Only react to token changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalQuery?.token]);

  const handleRun = useCallback(() => {
    const executable = query
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//"))
      .join("\n")
      .trim();
    if (executable) onRun(executable);
  }, [query, onRun]);

  const toggleComment = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    const { selectionStart, selectionEnd, value } = ta;
    const lines = value.split("\n");

    let pos = 0;
    let startLine = 0;
    let endLine = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineEnd = pos + lines[i].length;
      if (pos <= selectionStart && selectionStart <= lineEnd) startLine = i;
      if (pos <= selectionEnd && selectionEnd <= lineEnd) { endLine = i; break; }
      pos = lineEnd + 1;
    }

    const targetLines = lines.slice(startLine, endLine + 1);
    const allCommented = targetLines.every((l) => l.trimStart().startsWith("//"));

    const newLines = [...lines];
    for (let i = startLine; i <= endLine; i++) {
      if (allCommented) {
        newLines[i] = lines[i].replace(/^(\s*)\/\/ ?/, "$1");
      } else {
        newLines[i] = lines[i].replace(/^(\s*)/, "$1// ");
      }
    }

    const newValue = newLines.join("\n");
    updateQuery(newValue);

    const delta = newValue.length - value.length;
    requestAnimationFrame(() => {
      ta.selectionStart = selectionStart + (allCommented ? Math.min(0, delta) : Math.max(0, newLines[startLine].length - lines[startLine].length));
      ta.selectionEnd = selectionEnd + delta;
    });
  }, [updateQuery]);

  const handleBeautify = useCallback(() => {
    updateQuery((q) => beautifyQuery(q));
  }, [updateQuery]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        toggleComment();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        handleBeautify();
      }
    },
    [handleRun, toggleComment, handleBeautify],
  );

  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      setScrollTop(ta.scrollTop);
      setScrollLeft(ta.scrollLeft);
    }
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {/* Editor */}
      <div className="relative overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
        {/* Syntax-highlighted overlay */}
        <pre
          aria-hidden
          className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words px-3 py-2.5 font-mono text-sm leading-relaxed"
          style={{ transform: `translate(${-scrollLeft}px, ${-scrollTop}px)` }}
        >
          {renderHighlighted(query)}
        </pre>
        {/* Actual textarea (transparent text, visible caret) */}
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          rows={6}
          spellCheck={false}
          aria-label="Cypher query editor"
          className="relative z-10 w-full resize-none bg-transparent px-3 py-2.5 font-mono text-sm leading-relaxed text-transparent caret-[var(--color-text)] outline-none"
          placeholder="MATCH (n) RETURN n LIMIT 10"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleRun}
          disabled={loading || !query.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" /></svg>
              Running...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              Run Query
            </>
          )}
        </button>
        <button
          onClick={handleBeautify}
          disabled={!query.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 font-medium text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-border)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>
          Beautify
        </button>
        <span className="text-[var(--color-text-secondary)] text-xs">{MOD_KEY}+Enter run</span>
        <span className="text-[var(--color-text-secondary)] text-xs">{MOD_KEY}+/ comment</span>
        <span className="text-[var(--color-text-secondary)] text-xs">{MOD_KEY}+Shift+F beautify</span>
      </div>
    </div>
  );
}

type TokenType = "keyword" | "function" | "string" | "number" | "label" | "operator" | "bracket" | "comment" | "text";

const KEYWORDS = new Set([
  "MATCH", "OPTIONAL", "RETURN", "WHERE", "CREATE", "MERGE", "SET", "DELETE",
  "DETACH", "REMOVE", "WITH", "UNWIND", "AS", "ORDER", "BY", "SKIP", "LIMIT",
  "UNION", "ALL", "CALL", "YIELD", "AND", "OR", "NOT", "XOR", "IN", "IS",
  "NULL", "TRUE", "FALSE", "DISTINCT", "CASE", "WHEN", "THEN", "ELSE", "END",
  "ON", "EXISTS", "CONTAINS", "STARTS", "ENDS", "COUNT", "ASC", "DESC",
  "ASCENDING", "DESCENDING", "FOREACH", "LOAD", "CSV", "FROM", "HEADERS",
]);

const TOKEN_STYLES: Record<TokenType, string> = {
  keyword: "text-[var(--color-syntax-keyword)] font-semibold",
  function: "text-[var(--color-syntax-function)]",
  string: "text-[var(--color-syntax-string)]",
  number: "text-[var(--color-syntax-number)]",
  label: "text-[var(--color-syntax-label)]",
  operator: "text-[var(--color-syntax-operator)]",
  bracket: "text-[var(--color-text-secondary)]",
  comment: "italic text-[var(--color-text-secondary)] opacity-50",
  text: "text-[var(--color-text)]",
};

interface Token {
  type: TokenType;
  text: string;
}

const TOKEN_PATTERNS: [TokenType, RegExp][] = [
  ["string", /^(?:'[^']*'|"[^"]*")/],
  ["number", /^\b\d+(?:\.\d+)?\b/],
  ["label", /^:[A-Za-z_]\w*/],
  ["keyword", /^\b[A-Za-z]+\b/],
  ["operator", /^(?:<>|<=|>=|=~|[=<>!+\-*/^%])/],
  ["bracket", /^[()[\]{}]/],
];

function tokenizeLine(line: string): Token[] {
  if (line.trimStart().startsWith("//")) {
    return [{ type: "comment", text: line }];
  }

  const tokens: Token[] = [];
  let pos = 0;

  while (pos < line.length) {
    // Skip whitespace — emit as plain text
    if (/\s/.test(line[pos])) {
      let end = pos + 1;
      while (end < line.length && /\s/.test(line[end])) end++;
      tokens.push({ type: "text", text: line.slice(pos, end) });
      pos = end;
      continue;
    }

    let matched = false;
    const rest = line.slice(pos);

    for (const [type, pattern] of TOKEN_PATTERNS) {
      const m = rest.match(pattern);
      if (m) {
        let tokenType = type;

        if (type === "keyword") {
          const word = m[0].toUpperCase();
          if (KEYWORDS.has(word)) {
            tokenType = "keyword";
          } else if (pos + m[0].length < line.length && line[pos + m[0].length] === "(") {
            tokenType = "function";
          } else {
            tokenType = "text";
          }
        }

        if (type === "label") {
          // Only color as label if preceded by (, [, -, or start-of-line context for patterns
          if (pos > 0) {
            const prev = line[pos - 1];
            if (prev !== "(" && prev !== "[" && prev !== "-" && prev !== " ") {
              // It's a property access like n.name: or map key — treat as text
              tokenType = "text";
            }
          }
        }

        tokens.push({ type: tokenType, text: m[0] });
        pos += m[0].length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Accumulate unmatched characters (punctuation like . , etc.)
      const last = tokens[tokens.length - 1];
      if (last && last.type === "text") {
        last.text += line[pos];
      } else {
        tokens.push({ type: "text", text: line[pos] });
      }
      pos++;
    }
  }

  return tokens;
}

function renderHighlighted(text: string) {
  return text.split("\n").map((line, i, arr) => {
    const tokens = tokenizeLine(line);
    return (
      <span key={i}>
        {tokens.map((token, j) => (
          <span key={j} className={TOKEN_STYLES[token.type]}>{token.text}</span>
        ))}
        {i < arr.length - 1 ? "\n" : ""}
      </span>
    );
  });
}

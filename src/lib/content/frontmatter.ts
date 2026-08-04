/**
 * Minimal, deterministic frontmatter parser.
 *
 * Deliberately NOT a general YAML implementation. It parses exactly the closed
 * subset emitted by the ezorders-growth-os export adapter:
 *
 *   key: "quoted string"      key: 123      key: true      key: null
 *   key: []                   key: {}
 *   key:                      key:                    key:
 *     - "scalar item"           -                       nested: "value"
 *                                 field: "value"        deeper:
 *                                                         field: "value"
 *
 * Writing ~130 lines against a known emitter is preferable to taking a full YAML
 * dependency for machine-generated files whose shape we control on both sides.
 * Anything outside the subset raises rather than guessing — a silently
 * mis-parsed field is how a build ships wrong metadata.
 */

export class FrontmatterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FrontmatterError";
  }
}

export type Frontmatter = Record<string, unknown>;

/** Split a document into frontmatter data and the Markdown body. */
export function parseFrontmatter(raw: string): { data: Frontmatter; body: string } {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");

  if (!text.startsWith("---\n")) {
    throw new FrontmatterError("File must start with a `---` frontmatter block.");
  }
  const end = text.indexOf("\n---\n", 3);
  if (end === -1) {
    throw new FrontmatterError("Frontmatter block is not closed with `---`.");
  }

  const head = text.slice(4, end);
  const body = text.slice(end + 5).replace(/^\n+/, "");

  const lines = head.split("\n").filter((l) => l.trim() !== "" && !/^\s*#/.test(l));
  const { value } = parseBlock(lines, 0, 0);
  return { data: value as Frontmatter, body };
}

type Parsed = { value: unknown; next: number };

function indentOf(line: string): number {
  const m = line.match(/^ */);
  return m ? m[0].length : 0;
}

/** Parse a mapping or sequence at `indent`, starting at line `i`. */
function parseBlock(lines: string[], i: number, indent: number): Parsed {
  if (i >= lines.length) return { value: {}, next: i };

  // A sequence: lines at this indent beginning with "- ".
  if (/^\s*-(\s|$)/.test(lines[i]) && indentOf(lines[i]) === indent) {
    const items: unknown[] = [];
    let cursor = i;
    while (cursor < lines.length && indentOf(lines[cursor]) === indent && /^\s*-(\s|$)/.test(lines[cursor])) {
      const rest = lines[cursor].slice(indentOf(lines[cursor]) + 1).trim();
      if (rest === "") {
        // "-" alone: an object item whose fields are indented on following lines.
        const childIndent = cursor + 1 < lines.length ? indentOf(lines[cursor + 1]) : indent + 2;
        if (childIndent <= indent) {
          items.push(null);
          cursor += 1;
          continue;
        }
        const parsed = parseBlock(lines, cursor + 1, childIndent);
        items.push(parsed.value);
        cursor = parsed.next;
      } else {
        items.push(parseScalar(rest));
        cursor += 1;
      }
    }
    return { value: items, next: cursor };
  }

  // Otherwise a mapping.
  const map: Record<string, unknown> = {};
  let cursor = i;
  while (cursor < lines.length) {
    const line = lines[cursor];
    const lineIndent = indentOf(line);
    if (lineIndent < indent) break;
    if (lineIndent > indent) {
      throw new FrontmatterError(`Unexpected indentation at: "${line.trim()}"`);
    }

    const m = line.slice(indent).match(/^([A-Za-z0-9_-]+):(.*)$/);
    if (!m) throw new FrontmatterError(`Cannot parse frontmatter line: "${line.trim()}"`);

    const key = m[1];
    const rest = m[2].trim();

    if (rest !== "") {
      map[key] = parseScalar(rest);
      cursor += 1;
      continue;
    }

    // Empty value -> a nested block on the following lines.
    const childIndent = cursor + 1 < lines.length ? indentOf(lines[cursor + 1]) : -1;
    if (childIndent <= indent) {
      map[key] = null;
      cursor += 1;
      continue;
    }
    const parsed = parseBlock(lines, cursor + 1, childIndent);
    map[key] = parsed.value;
    cursor = parsed.next;
  }

  return { value: map, next: cursor };
}

function parseScalar(token: string): unknown {
  if (token === "[]") return [];
  if (token === "{}") return {};
  if (token === "null" || token === "~") return null;
  if (token === "true") return true;
  if (token === "false") return false;

  if (token.startsWith('"')) {
    if (!token.endsWith('"') || token.length < 2) {
      throw new FrontmatterError(`Unterminated quoted string: ${token}`);
    }
    return token
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }

  if (/^-?\d+$/.test(token)) return parseInt(token, 10);
  if (/^-?\d*\.\d+$/.test(token)) return parseFloat(token);

  // Bare strings are accepted but discouraged; the emitter always quotes.
  return token;
}

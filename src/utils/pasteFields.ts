import { FieldDef } from "../types";

/**
 * Find the closing quote of a quoted cell starting at `start` (the opening quote).
 * Doubled quotes ("") are escapes. Returns -1 when not closed.
 */
function findQuotedEnd(s: string, start: number): number {
  let j = start + 1;
  while (j < s.length) {
    if (s[j] === '"') {
      if (s[j + 1] === '"') {
        j += 2;
        continue;
      }
      return j;
    }
    j++;
  }
  return -1;
}

/**
 * Parse clipboard text copied from Excel / Google Sheets (TSV) into rows of cells.
 * Cells that contain line breaks are wrapped in quotes by Excel, with inner quotes doubled.
 * The trailing line break Excel appends is ignored.
 */
export function parseClipboardTable(text: string): string[][] {
  const s = text.replace(/\r\n?/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;

  while (i < s.length) {
    const ch = s[i];

    if (ch === '"' && cell === "") {
      const end = findQuotedEnd(s, i);
      const next = s[end + 1];
      // Only treat as a quoted cell when the quote closes right at a cell boundary
      if (
        end !== -1 &&
        (next === undefined || next === "\t" || next === "\n")
      ) {
        cell = s.slice(i + 1, end).replace(/""/g, '"');
        i = end + 1;
        continue;
      }
    }

    if (ch === "\t") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
    i++;
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/**
 * Fill descriptions downward starting from `startIndex` of the displayed rows,
 * like pasting a column in Excel.
 */
export function fillDescriptionsDown(
  displayed: FieldDef[],
  startIndex: number,
  values: string[],
) {
  let applied = 0;
  values.forEach((value, offset) => {
    const target = displayed[startIndex + offset];
    if (!target) return;
    target.description = value.trim();
    applied++;
  });
  return { applied, skipped: values.length - applied };
}

/**
 * Apply descriptions by matching the first column against field keys
 * (field name or dotted path, case-insensitive); the second column is the description.
 */
export function applyDescriptionsByKey(tree: FieldDef[], rows: string[][]) {
  const index = new Map<string, FieldDef[]>();
  const add = (key: string, f: FieldDef) => {
    const k = key.toLowerCase();
    const list = index.get(k);
    if (list) list.push(f);
    else index.set(k, [f]);
  };
  const walk = (list: FieldDef[], path: string) => {
    list.forEach((f) => {
      const fullPath = path ? `${path}.${f.name}` : f.name;
      add(f.name, f);
      if (fullPath !== f.name) add(fullPath, f);
      if (f.children && f.children.length > 0) walk(f.children, fullPath);
    });
  };
  walk(tree, "");

  let matched = 0;
  const unmatched: string[] = [];
  rows.forEach((row) => {
    const key = (row[0] ?? "").trim();
    if (!key) return;
    const targets = index.get(key.toLowerCase());
    if (!targets) {
      unmatched.push(key);
      return;
    }
    const desc = (row[1] ?? "").trim();
    targets.forEach((f) => (f.description = desc));
    matched++;
  });
  return { matched, unmatched };
}

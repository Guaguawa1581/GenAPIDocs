import { describe, it, expect } from "vitest";
import {
  parseClipboardTable,
  fillDescriptionsDown,
  applyDescriptionsByKey,
} from "../pasteFields";
import { FieldDef } from "../../types";

const field = (
  name: string,
  level = 0,
  children: FieldDef[] = [],
): FieldDef => ({
  id: name,
  name,
  type: children.length ? "object" : "string",
  example: "",
  description: "",
  level,
  children,
});

describe("parseClipboardTable", () => {
  it("parses a single Excel column with trailing CRLF", () => {
    expect(parseClipboardTable("實際工時\r\n除外時間\r\n進站時間\r\n")).toEqual(
      [["實際工時"], ["除外時間"], ["進站時間"]],
    );
  });

  it("parses multiple columns and keeps empty cells", () => {
    expect(parseClipboardTable("a\t說明A\r\nb\t\r\n")).toEqual([
      ["a", "說明A"],
      ["b", ""],
    ]);
  });

  it("handles quoted cells containing line breaks and quotes", () => {
    expect(
      parseClipboardTable('"line1\r\nline2"\tx\r\n"say ""hi"""\ty\r\n'),
    ).toEqual([
      ["line1\nline2", "x"],
      ['say "hi"', "y"],
    ]);
  });

  it("keeps quotes that are not a quoted cell", () => {
    expect(parseClipboardTable('"hi" there\r\nok\r\n')).toEqual([
      ['"hi" there'],
      ["ok"],
    ]);
  });

  it("returns empty for empty text", () => {
    expect(parseClipboardTable("")).toEqual([]);
  });
});

describe("fillDescriptionsDown", () => {
  it("fills from start index and reports overflow", () => {
    const rows = [field("a"), field("b"), field("c")];
    const result = fillDescriptionsDown(rows, 1, [" B ", "C", "D"]);
    expect(rows.map((f) => f.description)).toEqual(["", "B", "C"]);
    expect(result).toEqual({ applied: 2, skipped: 1 });
  });

  it("fills the name column when requested", () => {
    const rows = [field("a"), field("b")];
    fillDescriptionsDown(rows, 0, ["x", "y"], "name");
    expect(rows.map((f) => f.name)).toEqual(["x", "y"]);
    expect(rows.map((f) => f.description)).toEqual(["", ""]);
  });
});

describe("applyDescriptionsByKey", () => {
  it("matches by name, dotted path and ignores case", () => {
    const tree = [
      field("actualTotalHour"),
      field("produceDtls", 0, [field("woStatus", 1), field("logID", 1)]),
    ];
    const result = applyDescriptionsByKey(tree, [
      ["ActualTotalHour", "實際工時"],
      ["produceDtls.woStatus", "生產狀態"],
      ["logid", "紀錄SN"],
      ["notExist", "x"],
    ]);
    expect(tree[0].description).toBe("實際工時");
    expect(tree[1].children![0].description).toBe("生產狀態");
    expect(tree[1].children![1].description).toBe("紀錄SN");
    expect(result).toEqual({ matched: 3, unmatched: ["notExist"] });
  });
});

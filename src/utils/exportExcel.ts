import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ApiDocConfig } from "../types";
import { generateUrlExample } from "./parseUrl";
import { flattenFields } from "./parseJson";
import { EXCEL_STYLES } from "../config/excelStyles";

// Helper to parse URL for rich text
function parseUrlToRichText(url: string) {
  const parts: any[] = [];
  let currentStr = "";
  let inBracket = false;

  for (let i = 0; i < url.length; i++) {
    const char = url[i];
    if (char === "{") {
      if (currentStr) {
        parts.push({
          text: currentStr,
          font: { name: EXCEL_STYLES.FONT.NAME, size: EXCEL_STYLES.FONT.SIZE },
        });
      }
      // Add '{' as normal text
      parts.push({
        text: "{",
        font: { name: EXCEL_STYLES.FONT.NAME, size: EXCEL_STYLES.FONT.SIZE },
      });
      currentStr = "";
      inBracket = true;
    } else if (char === "}") {
      if (currentStr) {
        parts.push({
          text: currentStr,
          font: {
            name: EXCEL_STYLES.FONT.NAME,
            size: EXCEL_STYLES.FONT.SIZE,
            color: EXCEL_STYLES.FONT.COLOR_BLUE,
          },
        });
      }
      // Add '}' as normal text
      parts.push({
        text: "}",
        font: { name: EXCEL_STYLES.FONT.NAME, size: EXCEL_STYLES.FONT.SIZE },
      });
      currentStr = "";
      inBracket = false;
    } else {
      currentStr += char;
    }
  }
  if (currentStr) {
    parts.push({
      text: currentStr,
      font: {
        name: EXCEL_STYLES.FONT.NAME,
        size: EXCEL_STYLES.FONT.SIZE,
        ...(inBracket ? { color: EXCEL_STYLES.FONT.COLOR_BLUE } : {}),
      },
    });
  }
  return { richText: parts };
}

// Helper to determine status color
function getStatusColor(code: number) {
  if (code >= 200 && code < 300) return EXCEL_STYLES.FONT.COLOR_GREEN;
  if (code >= 400 && code < 500) return EXCEL_STYLES.FONT.COLOR_RED;
  if (code >= 500) return EXCEL_STYLES.FONT.COLOR_YELLOW;
  return EXCEL_STYLES.FONT.COLOR_DEFAULT;
}

function getActionText(method: string) {
  const methodMap: Record<string, string> = {
    GET: "HttpGet",
    POST: "HttpPost",
    PUT: "HttpPatch、HttpPut",
    DELETE: "HttpDelete",
  };
  return methodMap[method] || method;
}

export async function exportToExcel(config: ApiDocConfig) {
  const workbook = new ExcelJS.Workbook();
  const titleForName =
    config.apiMeta.description || config.apiMeta.title || "API";
  const sanitizedTitle = titleForName.replace(/[\\/?*:[\]]/g, "_");
  const sheetName = `${config.apiMeta.method}_${sanitizedTitle}`.slice(0, 31);
  const worksheet = workbook.addWorksheet(sheetName);

  let currentRowIdx = 1;

  // Helper to add a row and apply default styles
  const addRow = (values: any[]) => {
    const row = worksheet.getRow(currentRowIdx);
    row.values = values;

    // Apply default styles to all cells in the row (columns 1-5)
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      cell.font = {
        name: EXCEL_STYLES.FONT.NAME,
        size: EXCEL_STYLES.FONT.SIZE,
      };
      cell.border = {
        top: { style: EXCEL_STYLES.BORDER.THIN },
        left: { style: EXCEL_STYLES.BORDER.THIN },
        bottom: { style: EXCEL_STYLES.BORDER.THIN },
        right: { style: EXCEL_STYLES.BORDER.THIN },
      };
      cell.alignment = EXCEL_STYLES.ALIGNMENT.DEFAULT;
    }

    currentRowIdx++;
    return row;
  };

  // Helper to merge cells
  const mergeCells = (r: number, c1: number, c2: number) => {
    worksheet.mergeCells(r, c1, r, c2);
  };

  // Helper for double top border
  const setDoubleTopBorder = (rowIdx: number) => {
    const row = worksheet.getRow(rowIdx);
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      cell.border = {
        ...cell.border,
        top: { style: EXCEL_STYLES.BORDER.DOUBLE },
      };
    }
  };

  // Helper to remove internal borders for Parameter/Meaning table
  const fixParameterTableBorders = (start: number, end: number) => {
    for (let r = start; r <= end; r++) {
      const row = worksheet.getRow(r);
      const c4 = row.getCell(4);
      const c5 = row.getCell(5);

      // Remove vertical border between 4 and 5
      c4.border = {
        ...c4.border,
        right: undefined,
      };
      c5.border = {
        ...c5.border,
        left: undefined,
      };

      // Remove horizontal borders between rows within this block (4 and 5)
      if (r < end) {
        c4.border = { ...c4.border, bottom: undefined };
        c5.border = { ...c5.border, bottom: undefined };
      }
      if (r > start) {
        c4.border = { ...c4.border, top: undefined };
        c5.border = { ...c5.border, top: undefined };
      }
    }
  };

  // --- 1. Header Section ---
  const titleContent = config.apiMeta.title;
  addRow(["API: 功能", titleContent]);
  mergeCells(currentRowIdx - 1, 2, 5); // B to E

  // API URL
  const urlRichText = parseUrlToRichText(config.apiMeta.url);
  addRow(["API: URL", urlRichText]);
  mergeCells(currentRowIdx - 1, 2, 5);

  const urlExample = generateUrlExample(
    config.apiMeta.url,
    config.routeParams,
    config.queryParams,
  );

  if (config.urlExamples && config.urlExamples.length > 0) {
    config.urlExamples.forEach((ex) => {
      addRow([ex.name, ex.url]);
      mergeCells(currentRowIdx - 1, 2, 5);
      worksheet.getCell(currentRowIdx - 1, 1).alignment =
        EXCEL_STYLES.ALIGNMENT.RIGHT;
    });
  } else {
    addRow(["", ""]);
    mergeCells(currentRowIdx - 1, 2, 5);
  }

  // --- Route Params ---
  if (config.routeParams.length > 0) {
    const startRow = currentRowIdx;
    config.routeParams.forEach((p, index) => {
      const firstCol = index === 0 ? "API: Route" : "";
      addRow([firstCol, p.name, p.description]);
      mergeCells(currentRowIdx - 1, 3, 5); // C to E
    });
    // Merge "FormRoute" vertical
    if (currentRowIdx - 1 > startRow) {
      worksheet.mergeCells(startRow, 1, currentRowIdx - 1, 1);
    }
    // setDoubleTopBorder(startRow);
  } else {
    const startRow = currentRowIdx;
    addRow(["API: Route", "", ""]);
    mergeCells(startRow, 3, 5); // C to E
    // setDoubleTopBorder(startRow);
  }

  // --- Query Params ---
  const visibleQueryParams = config.queryParams.filter(
    (p) => p.showInDesc !== false,
  );
  if (visibleQueryParams.length > 0) {
    const startRow = currentRowIdx;
    visibleQueryParams.forEach((p, index) => {
      const firstCol = index === 0 ? "API: Query" : "";
      addRow([firstCol, p.name, p.description]);
      mergeCells(currentRowIdx - 1, 3, 5);
    });
    if (currentRowIdx - 1 > startRow) {
      worksheet.mergeCells(startRow, 1, currentRowIdx - 1, 1);
    }
    // setDoubleTopBorder(startRow);
  } else {
    const startRow = currentRowIdx;
    addRow(["API: Query", "", ""]);
    mergeCells(startRow, 3, 5);
    // setDoubleTopBorder(startRow);
  }

  // --- Action ---
  const actionText = getActionText(config.apiMeta.method);
  addRow(["行為", actionText]);
  mergeCells(currentRowIdx - 1, 2, 5);
  // Bold actionText (Cell B)
  worksheet.getCell(currentRowIdx - 1, 2).font = {
    name: EXCEL_STYLES.FONT.NAME,
    size: EXCEL_STYLES.FONT.SIZE,
    bold: true,
  };

  // --- 2. Request Body Section ---
  const requestFlat = flattenFields(config.requestFields);
  if (requestFlat.length > 0) {
    const startBodyRow = currentRowIdx;

    // Header
    addRow(["JSON Body"]);
    mergeCells(startBodyRow, 1, 5);
    setDoubleTopBorder(startBodyRow);
    worksheet.getCell(startBodyRow, 1).alignment =
      EXCEL_STYLES.ALIGNMENT.CENTER;

    // Subheader
    const subHeaderRowIdx = currentRowIdx;
    addRow(["", "", "", "參數", "意思"]);
    // Bold "參數", "意思"
    worksheet.getCell(subHeaderRowIdx, 4).font = {
      name: EXCEL_STYLES.FONT.NAME,
      size: EXCEL_STYLES.FONT.SIZE,
      bold: true,
    };
    worksheet.getCell(subHeaderRowIdx, 5).font = {
      name: EXCEL_STYLES.FONT.NAME,
      size: EXCEL_STYLES.FONT.SIZE,
      bold: true,
    };

    requestFlat.forEach((f) => {
      const prefixStr = "~".repeat(f.level || 0);
      addRow(["", "", "", prefixStr + f.name, f.description]);
    });

    const jsonStartRow = startBodyRow + 1; // The subheader row
    // Ensure at least 5 rows height for the JSON block to look good
    const jsonEndRow = Math.max(currentRowIdx - 1, jsonStartRow + 5);

    while (currentRowIdx <= jsonEndRow) {
      addRow(["", "", "", "", ""]);
    }

    // Merge for JSON string
    worksheet.mergeCells(jsonStartRow, 1, jsonEndRow, 3);

    let jsonStr = "";
    try {
      jsonStr = JSON.stringify(
        JSON.parse(config.requestJsonRaw || "{}"),
        null,
        2,
      );
    } catch (e) {
      jsonStr = config.requestJsonRaw || "";
    }
    const jsonCell = worksheet.getCell(jsonStartRow, 1);
    jsonCell.value = jsonStr;
    jsonCell.alignment = EXCEL_STYLES.ALIGNMENT.TOP_LEFT;
    // Remove internal borders for params block
    fixParameterTableBorders(subHeaderRowIdx, currentRowIdx - 1);
  }

  // --- 3. Responses Section ---
  const responsesHeaderRow = currentRowIdx;
  addRow(["Responses JSON"]);
  mergeCells(responsesHeaderRow, 1, 5);
  setDoubleTopBorder(responsesHeaderRow);
  worksheet.getCell(responsesHeaderRow, 1).alignment =
    EXCEL_STYLES.ALIGNMENT.CENTER;

  config.responses.forEach((resp) => {
    const startRespRow = currentRowIdx;

    // Status Row
    // Color code based on range
    const codeNum = parseInt(String(resp.statusCode));
    const colorArgb = getStatusColor(codeNum);

    addRow([resp.statusCode, resp.statusText, "", resp.note, ""]);
    mergeCells(currentRowIdx - 1, 2, 3); // B-C
    mergeCells(currentRowIdx - 1, 4, 5); // D-E
    setDoubleTopBorder(startRespRow);

    // Apply color and alignment to Status Code (Col 1)
    const codeCell = worksheet.getCell(currentRowIdx - 1, 1);
    codeCell.font = {
      name: EXCEL_STYLES.FONT.NAME,
      size: EXCEL_STYLES.FONT.SIZE,
      color: colorArgb,
    };
    codeCell.alignment = EXCEL_STYLES.ALIGNMENT.RIGHT;

    // Apply color and alignment to Status Text (Col 2 - Merged)
    // Note: Col 2 is the start of merged cell for status text
    const textCell = worksheet.getCell(currentRowIdx - 1, 2);
    textCell.font = {
      name: EXCEL_STYLES.FONT.NAME,
      size: EXCEL_STYLES.FONT.SIZE,
      color: colorArgb,
    };
    textCell.alignment = EXCEL_STYLES.ALIGNMENT.CENTER;
    // SubHeader
    const subHeaderRowIdx = currentRowIdx;
    addRow(["", "", "", "參數", "意思"]);
    worksheet.getCell(subHeaderRowIdx, 4).font = {
      name: EXCEL_STYLES.FONT.NAME,
      size: EXCEL_STYLES.FONT.SIZE,
      bold: true,
    };
    worksheet.getCell(subHeaderRowIdx, 5).font = {
      name: EXCEL_STYLES.FONT.NAME,
      size: EXCEL_STYLES.FONT.SIZE,
      bold: true,
    };

    const respFlat = flattenFields(resp.fields);
    respFlat.forEach((f) => {
      const prefix = "~".repeat(f.level || 0);
      addRow(["", "", "", prefix + f.name, f.description]);
    });

    const jsonStartRow = startRespRow + 1; // The subheader row
    const jsonEndRow = Math.max(currentRowIdx - 1, jsonStartRow + 4) + 1; //多一行

    while (currentRowIdx <= jsonEndRow) {
      addRow(["", "", "", "", ""]);
    }

    // Merge JSON block (Cols 1-3)
    worksheet.mergeCells(jsonStartRow, 1, jsonEndRow, 3);

    let jsonStr = "";
    try {
      jsonStr = JSON.stringify(JSON.parse(resp.rawJson || "{}"), null, 2);
    } catch (e) {
      jsonStr = resp.rawJson || "";
    }
    const jsonCell = worksheet.getCell(jsonStartRow, 1);
    jsonCell.value = jsonStr;
    jsonCell.alignment = EXCEL_STYLES.ALIGNMENT.TOP_LEFT;

    // Remove internal borders for params block
    fixParameterTableBorders(subHeaderRowIdx, currentRowIdx - 1);
  });

  // config
  for (let i = 0; i < 5; i++) {
    worksheet.addRow([]);
  }
  worksheet.addRow(["Excel Config"]);
  worksheet.addRow([JSON.stringify(config, null)]);
  currentRowIdx += 7;

  // Column Widths
  worksheet.getColumn(1).width = 20;
  worksheet.getColumn(2).width = 20;
  worksheet.getColumn(3).width = 20;
  worksheet.getColumn(4).width = 25;
  worksheet.getColumn(5).width = 75;

  // Write file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${sheetName}.xlsx`);
}

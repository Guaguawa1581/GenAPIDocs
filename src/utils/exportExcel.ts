import * as XLSX from "xlsx";
import { ApiDocConfig, FieldDef } from "../types";
import { generateUrlExample } from "./parseUrl";
import { flattenFields } from "./parseJson";

export function exportToExcel(config: ApiDocConfig) {
  const wb = XLSX.utils.book_new();
  const wsData: any[][] = [];
  const merges: XLSX.Range[] = [];

  const fillToC = (arr: any[]) => {
    while (arr.length < 3) arr.push("");
    return arr;
  };

  let currentRow = 0;

  // --- 1. Header Section ---
  let titleContent: any = config.apiMeta.title;
  if (titleContent.startsWith("=")) {
    titleContent = { f: titleContent.slice(1) };
  }
  wsData.push(["API功能", titleContent]);
  merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 4 } });
  currentRow++;

  wsData.push(["API URL", config.apiMeta.url]);
  merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 4 } });
  currentRow++;

  const urlExample = generateUrlExample(
    config.apiMeta.url,
    config.routeParams,
    config.queryParams,
  );

  if (config.urlExamples && config.urlExamples.length > 0) {
    config.urlExamples.forEach((ex) => {
      wsData.push([ex.name || "URL範例", ex.url]);
      merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 4 } });
      currentRow++;
    });
  } else {
    wsData.push(["URL範例", urlExample]);
    merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 4 } });
    currentRow++;
  }

  // --- Route & Query Tables ---
  // RouteParams
  if (config.routeParams.length > 0) {
    const routeParamsStartRow: number = currentRow;
    const routeParamsEndRow: number =
      currentRow + config.routeParams.length - 1;

    // RouteTitle垂直合併
    merges.push({
      s: { r: routeParamsStartRow, c: 0 },
      e: { r: routeParamsEndRow, c: 0 },
    });
    // params 在B,C欄列出
    config.routeParams.forEach((p, index) => {
      // 第一列要包含 "FromRoute"，其餘 A 欄給空字串
      const firstCol = index === 0 ? "FromRoute" : "";
      let descValue: any = p.description;
      if (typeof descValue === "string" && descValue.startsWith("=")) {
        descValue = { f: descValue.slice(1) };
      }

      wsData.push([firstCol, p.name, descValue]);

      // 處理每一列的 C 到 E 欄合併 (Index 2 到 4)
      merges.push({
        s: { r: currentRow, c: 2 }, // C 欄
        e: { r: currentRow, c: 4 }, // E 欄
      });

      currentRow++;
    });

    wsData.push([]);
    currentRow++;
  } else {
    // 沒資料也跳一行
    wsData.push(["FromRoute", "", ""]);
    merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 4 } });
    currentRow++;
  }

  // QueryParams
  const visibleQueryParams = config.queryParams.filter(
    (p) => p.showInDesc !== false,
  );
  if (visibleQueryParams.length > 0) {
    const queryStartRow = currentRow;
    const queryEndRow = currentRow + visibleQueryParams.length - 1;

    // 1. A 欄垂直合併：顯示 "FromQuery"
    merges.push({
      s: { r: queryStartRow, c: 0 },
      e: { r: queryEndRow, c: 0 },
    });

    // 2. 迭代寫入資料
    visibleQueryParams.forEach((p, index) => {
      let descValue: any = p.description;

      // 支援 = 開頭的 Excel 公式
      if (typeof descValue === "string" && descValue.startsWith("=")) {
        descValue = { f: descValue.slice(1) };
      }

      // 第一列 A 欄填值，其餘留空 (靠 merges 合併)
      const firstCol = index === 0 ? "FromQuery" : "";
      wsData.push([firstCol, p.name, descValue]);

      // 3. C 欄到 E 欄水平合併 (c: 2 到 c: 4)
      merges.push({
        s: { r: currentRow, c: 2 },
        e: { r: currentRow, c: 4 },
      });

      currentRow++;
    });

    // 結尾跳行
    wsData.push([]);
    currentRow++;
  } else {
    // 沒資料時的處理：A 欄標題，B-E 欄合併寫「無參數」
    wsData.push(["FromQuery", "無參數資料"]);
    merges.push({
      s: { r: currentRow, c: 1 },
      e: { r: currentRow, c: 4 },
    });
    currentRow++;
  }

  const actionText = `Http${config.apiMeta.method.charAt(0).toUpperCase()}${config.apiMeta.method.slice(1).toLowerCase()}`;
  wsData.push(["行為", actionText]);
  merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 4 } });
  currentRow++;

  // --- 2. Request Body Section ---
  const requestFlat = flattenFields(config.requestFields);
  if (requestFlat.length > 0) {
    const startBodyRow = currentRow;
    wsData.push(fillToC(["JSON Body"]));
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } });
    currentRow++;

    const row2 = fillToC(["", "", ""]);
    row2[3] = "參數";
    row2[4] = "意思";
    wsData.push(row2);
    currentRow++;

    requestFlat.forEach((f) => {
      const prefix = "~".repeat(f.level || 0);
      let descValue: any = f.description;
      if (descValue.startsWith("=")) {
        descValue = { f: descValue.slice(1) };
      }
      const row = fillToC(["", "", ""]);
      row[3] = prefix + f.name;
      row[4] = descValue;
      wsData.push(row);
      currentRow++;
    });

    const jsonEndRow = Math.max(currentRow - 1, startBodyRow + 5);
    merges.push({
      s: { r: startBodyRow + 1, c: 0 },
      e: { r: jsonEndRow, c: 2 },
    });

    try {
      wsData[startBodyRow + 1][0] = JSON.stringify(
        JSON.parse(config.requestJsonRaw || "{}"),
        null,
        2,
      );
    } catch (e) {
      wsData[startBodyRow + 1][0] = config.requestJsonRaw;
    }

    while (wsData.length <= jsonEndRow) {
      wsData.push(["", "", "", "", ""]);
    }
    currentRow = wsData.length;
    wsData.push([]);
    currentRow++;
  }

  // --- 3. Responses Section ---
  config.responses.forEach((resp) => {
    const startRespRow = currentRow;
    const combinedStatus = `${resp.statusCode} ${resp.statusText}${resp.note ? ` (${resp.note})` : ""}`;
    const row1 = [combinedStatus, "", "", "回傳Json", ""];
    wsData.push(row1);
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 2 } });
    merges.push({ s: { r: currentRow, c: 3 }, e: { r: currentRow, c: 4 } });
    currentRow++;

    const row2 = ["", "", "", "參數", "意思"];
    wsData.push(row2);
    currentRow++;

    const respFlat = flattenFields(resp.fields);
    respFlat.forEach((f) => {
      const prefix = "~".repeat(f.level || 0);
      let descValue: any = f.description;
      if (descValue.startsWith("=")) {
        descValue = { f: descValue.slice(1) };
      }
      wsData.push(["", "", "", prefix + f.name, descValue]);
      currentRow++;
    });

    const jsonEndRow = Math.max(currentRow - 1, startRespRow + 5);
    merges.push({
      s: { r: startRespRow + 1, c: 0 },
      e: { r: jsonEndRow, c: 2 },
    });

    try {
      wsData[startRespRow + 1][0] = JSON.stringify(
        JSON.parse(resp.rawJson || "{}"),
        null,
        2,
      );
    } catch (e) {
      wsData[startRespRow + 1][0] = resp.rawJson || "";
    }

    while (wsData.length <= jsonEndRow) {
      wsData.push(["", "", "", "", ""]);
    }
    currentRow = wsData.length;
    wsData.push([]);
    currentRow++;
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!merges"] = merges;

  ws["!cols"] = [
    { wch: 15 }, // A
    { wch: 15 }, // B
    { wch: 15 }, // C
    { wch: 25 }, // D
    { wch: 40 }, // E
  ];

  const titleForName =
    config.apiMeta.description || config.apiMeta.title || "API";

  const sanitizedTitle = titleForName.replace(/[\\/?*:[\]]/g, "_");
  const sheetName = `${config.apiMeta.method}_${sanitizedTitle}`.slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${sheetName}.xlsx`);
}

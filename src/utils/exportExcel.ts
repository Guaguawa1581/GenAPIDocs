import * as XLSX from 'xlsx';
import { ApiDocConfig } from '../types';
import { generateUrlExample } from './parseUrl';

export function exportToExcel(config: ApiDocConfig) {
  const wb = XLSX.utils.book_new();
  const wsData: any[][] = [];
  const merges: XLSX.Range[] = [];

  // Helper to push empty columns to align with D/E
  const fillToC = (arr: any[]) => {
    while (arr.length < 3) arr.push('');
    return arr;
  };

  let currentRow = 0;

  // --- 1. Header Section ---
  wsData.push(['功能說明', config.apiMeta.description || config.apiMeta.title]);
  merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 4 } }); 
  currentRow++;

  wsData.push(['URL', config.apiMeta.url]);
  merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 4 } });
  currentRow++;

  const urlExample = generateUrlExample(config.apiMeta.url, config.routeParams, config.queryParams);
  wsData.push(['URL 範例', urlExample]);
  merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 4 } });
  currentRow++;

  const actionText = `Http${config.apiMeta.method.charAt(0).toUpperCase()}${config.apiMeta.method.slice(1).toLowerCase()}`;
  wsData.push(['行為', actionText]);
  currentRow++;

  wsData.push([]); currentRow++;

  // --- Route & Query Tables (Standard) ---
  if (config.routeParams.length > 0) {
    wsData.push(['Route 區塊表格']);
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } });
    currentRow++;
    wsData.push(['參數名稱', '意思']);
    currentRow++;
    config.routeParams.forEach(p => {
      wsData.push([p.name, p.description]);
      currentRow++;
    });
    wsData.push([]); currentRow++;
  }

  if (config.queryParams.length > 0) {
    wsData.push(['FromQuery 區塊表格']);
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } });
    currentRow++;
    wsData.push(['參數名稱', '意思(可含枚舉文字)']);
    currentRow++;
    config.queryParams.forEach(p => {
      wsData.push([p.name, p.description]);
      currentRow++;
    });
    wsData.push([]); currentRow++;
  }

  // --- 2. JSON Body Section (POST/PUT/DELETE) ---
  const hasRequestBody = ['POST', 'PUT', 'DELETE'].includes(config.apiMeta.method) && config.requestJsonRaw;
  if (hasRequestBody) {
    const startBodyRow = currentRow;
    // Row 1: Title
    wsData.push(fillToC(['JSON Body']));
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } });
    currentRow++;

    // Row 2: Header for table
    const row2 = fillToC(['', '', '']);
    row2[3] = '參數';
    row2[4] = '意思';
    wsData.push(row2);
    currentRow++;

    // Row 3+: Parameters
    config.requestFields.forEach(f => {
      const prefix = '~'.repeat(f.level || 0);
      const row = fillToC(['', '', '']);
      row[3] = prefix + f.name;
      row[4] = f.description;
      wsData.push(row);
      currentRow++;
    });

    // Merge JSON Area A:C
    // A(startRow+1) ~ C(startRow + 參數數量 + 4) -> let's just cover the params row
    const jsonEndRow = Math.max(currentRow - 1, startBodyRow + 5); 
    merges.push({ s: { r: startBodyRow + 1, c: 0 }, e: { r: jsonEndRow, c: 2 } });
    
    // Fill formatted JSON in the merged top cell
    try {
        wsData[startBodyRow + 1][0] = JSON.stringify(JSON.parse(config.requestJsonRaw), null, 2);
    } catch(e) {
        wsData[startBodyRow + 1][0] = config.requestJsonRaw;
    }

    // Ensure we are past the JSON block
    while (wsData.length <= jsonEndRow) {
        wsData.push(['', '', '', '', '']);
    }
    currentRow = wsData.length;
    wsData.push([]); currentRow++;
  }

  // --- 3. Responses Section ---
  config.responses.forEach(resp => {
    const startRespRow = currentRow;
    // Row 1: Header
    const row1 = [resp.statusCode, resp.statusText, '', '回傳Json', ''];
    wsData.push(row1);
    merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 2 } }); // Status Text
    merges.push({ s: { r: currentRow, c: 3 }, e: { r: currentRow, c: 4 } }); // "回傳Json" title
    currentRow++;

    // Row 2: Table Header
    const row2 = ['', '', '', '參數', '意思'];
    wsData.push(row2);
    currentRow++;

    // Fields
    let paramCount = 0;
    if (resp.statusCode === 200) {
      config.responseFields.forEach(f => {
        wsData.push(['', '', '', f.name, f.description]);
        currentRow++;
        paramCount++;
      });
    } else if (resp.statusCode === 404) {
      wsData.push(['', '', '', '狀態404：查無的錯誤，讀取message', '']);
      merges.push({ s: { r: currentRow, c: 3 }, e: { r: currentRow, c: 4 } });
      currentRow++;
      paramCount = 1;
    }

    // Merge JSON Area A:C
    const jsonEndRow = Math.max(currentRow - 1, startRespRow + 4);
    merges.push({ s: { r: startRespRow + 1, c: 0 }, e: { r: jsonEndRow, c: 2 } });
    
    try {
        wsData[startRespRow + 1][0] = JSON.stringify(JSON.parse(resp.rawJson || '{}'), null, 2);
    } catch(e) {
        wsData[startRespRow + 1][0] = resp.rawJson || '';
    }

    while (wsData.length <= jsonEndRow) {
        wsData.push(['', '', '', '', '']);
    }
    currentRow = wsData.length;
    wsData.push([]); currentRow++;
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!merges'] = merges;
  
  // Column Widths
  ws['!cols'] = [
    { wch: 15 }, // A
    { wch: 15 }, // B
    { wch: 15 }, // C
    { wch: 25 }, // D
    { wch: 40 }, // E
  ];

  const sheetName = `${config.apiMeta.method}_${config.apiMeta.title || 'API'}`.slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${sheetName}.xlsx`);
}

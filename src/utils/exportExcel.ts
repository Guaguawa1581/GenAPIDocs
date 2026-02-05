import * as XLSX from 'xlsx';
import { ApiDocConfig, FieldDef } from '../types';
import { generateUrlExample } from './parseUrl';
import { flattenFields } from './parseJson';

export function exportToExcel(config: ApiDocConfig) {
  const wb = XLSX.utils.book_new();
  const wsData: any[][] = [];
  const merges: XLSX.Range[] = [];

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

  // --- Route & Query Tables ---
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

  // --- 2. Request Body Section ---
  const requestFlat = flattenFields(config.requestFields);
  if (requestFlat.length > 0) {
    const startBodyRow = currentRow;
    wsData.push(fillToC(['JSON Body']));
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } });
    currentRow++;

    const row2 = fillToC(['', '', '']);
    row2[3] = '參數';
    row2[4] = '意思';
    wsData.push(row2);
    currentRow++;

    requestFlat.forEach(f => {
      const prefix = '~'.repeat(f.level || 0);
      const row = fillToC(['', '', '']);
      row[3] = prefix + f.name;
      row[4] = f.description;
      wsData.push(row);
      currentRow++;
    });

    const jsonEndRow = Math.max(currentRow - 1, startBodyRow + 5); 
    merges.push({ s: { r: startBodyRow + 1, c: 0 }, e: { r: jsonEndRow, c: 2 } });
    
    try {
        wsData[startBodyRow + 1][0] = JSON.stringify(JSON.parse(config.requestJsonRaw || '{}'), null, 2);
    } catch(e) {
        wsData[startBodyRow + 1][0] = config.requestJsonRaw;
    }

    while (wsData.length <= jsonEndRow) {
        wsData.push(['', '', '', '', '']);
    }
    currentRow = wsData.length;
    wsData.push([]); currentRow++;
  }

  // --- 3. Responses Section ---
  config.responses.forEach(resp => {
    const startRespRow = currentRow;
    const combinedStatus = `${resp.statusCode} ${resp.statusText}${resp.note ? ` (${resp.note})` : ''}`;
    const row1 = [combinedStatus, '', '', '回傳Json', ''];
    wsData.push(row1);
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 2 } });
    merges.push({ s: { r: currentRow, c: 3 }, e: { r: currentRow, c: 4 } });
    currentRow++;

    const row2 = ['', '', '', '參數', '意思'];
    wsData.push(row2);
    currentRow++;

    const respFlat = flattenFields(resp.fields);
    respFlat.forEach(f => {
      const prefix = '~'.repeat(f.level || 0);
      wsData.push(['', '', '', prefix + f.name, f.description]);
      currentRow++;
    });

    const jsonEndRow = Math.max(currentRow - 1, startRespRow + 5);
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

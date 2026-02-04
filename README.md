# API 文件 Excel 產生器 (API Document Excel Generator)

這是一個基於 Vue 3 + Vite + PrimeVue 的互動式網站，用於離線產生符合公司既有版型的 API 文件 Excel 檔案。

## 功能特點
- **步驟式 UI**：直觀的導向式輸入流程。
- **自動解析**：自動從 URL 提取 Path/Query 參數，從 JSON 提取欄位。
- **離線可用**：所有邏輯都在前端執行，無需後端支援。
- **草稿保存**：自動將資料存入 `localStorage`，重新整理也不會遺失。
- **Excel 匯出**：產生相容於 Google Sheets 的 `.xlsx` 檔案。

## 技術棧
- Vite + Vue 3 (Composition API)
- TypeScript
- PrimeVue (UI 元件庫)
- Pinia (狀態管理)
- SheetJS (Excel 產生)
- Vitest (單元測試)

## 快速開始

### 安裝依賴
```bash
npm install
```

### 啟動開發伺服器
```bash
npm run dev
```

### 跑單元測試
```bash
npm run test
```

## 使用步驟
1. **選擇模板**：根據 API 性質選擇對應方法（GET/POST/PUT/DELETE/List）。
2. **基本資訊**：填寫 API 名稱與 URL（支援 `{id}` 語法）。
3. **JSON 範例**：貼上 Request 與 Response 的 JSON 範例。
4. **欄位說明**：補全解析出來的參數與欄位描述。
5. **匯出**：預覽並下載 Excel 檔案。

export interface ExcelCellLayout {
  value: string;
  bold?: boolean;
  rowSpan?: number;
  colSpan?: number;
  type?: 'label' | 'value' | 'header';
}

export const EXCEL_TEMPLATES = {
  GET: {
    sections: [
      { id: 'meta_title', label: 'API：功能', fields: ['title'] },
      { id: 'meta_url', label: 'API：URL', fields: ['url'] },
      { id: 'path_params', label: 'Path 區塊表格', type: 'table' },
      { id: 'query_params', label: 'FromQuery 區塊表格', type: 'table' },
      { id: 'action', label: '行為', value: 'HttpGet' },
      { id: 'responses', label: 'Responses', type: 'responses' }
    ]
  },
  // Other templates can be added here
};

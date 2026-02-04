export type TemplateType = 'list' | 'get' | 'post' | 'put' | 'delete';

export interface ParamDef {
  name: string;
  description: string;
  example: string; // Required for URL example generation
}

export interface FieldDef {
  name: string;
  type: string;
  example: string;
  description: string;
  required?: boolean;
  level?: number; // For nesting visualization ~
}

export interface ApiResponse {
  statusCode: number;
  statusText: string;
  note?: string;
  rawJson: string;
}

export interface ApiDocConfig {
  templateType: TemplateType;
  apiMeta: {
    title: string;
    description: string;
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  };
  routeParams: ParamDef[];
  queryParams: ParamDef[];
  requestJsonRaw: string;
  responseJsonRaw: string;
  responseFields: FieldDef[]; // Derived from first-layer of response.records[0]
  requestFields: FieldDef[];  // Derived from flattened request JSON
  responses: ApiResponse[];
}

export const DEFAULT_CONFIG: ApiDocConfig = {
  templateType: 'get',
  apiMeta: {
    title: '',
    description: '',
    url: '',
    method: 'GET',
  },
  routeParams: [],
  queryParams: [],
  requestJsonRaw: '',
  responseJsonRaw: '',
  responseFields: [],
  requestFields: [],
  responses: [
    { statusCode: 200, statusText: 'Success', rawJson: '' },
    { statusCode: 404, statusText: 'Not Found', note: '讀取 message', rawJson: '{"message": "Not Found"}' }
  ],
};

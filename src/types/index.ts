export type TemplateType = "list" | "get" | "post" | "put" | "delete";

export interface ParamDef {
  name: string;
  description: string;
  example: string;
  showInDesc?: boolean;
  includeInUrl?: boolean;
}

export interface FieldDef {
  id: string;
  name: string;
  type: string;
  example: string;
  description: string;
  level: number;
  expanded?: boolean;
  isCustom?: boolean;
  children?: FieldDef[]; // Recursive structure
}

export interface ApiResponse {
  id: string;
  statusCode: number;
  statusText: string;
  note?: string;
  rawJson: string;
  fields: FieldDef[]; // Top level fields
}

export interface UrlExample {
  id: string;
  name: string;
  url: string;
}

export interface ApiDocConfig {
  templateType: TemplateType;
  apiMeta: {
    title: string;
    description: string;
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
  };
  routeParams: ParamDef[];
  queryParams: ParamDef[];
  urlExamples: UrlExample[];
  requestJsonRaw: string;
  requestFields: FieldDef[];
  responses: ApiResponse[];
}

export const createDefaultFields = (): FieldDef[] => [];

export const createDefaultResponse = (
  code: number,
  text: string,
  note: string = "",
): ApiResponse => ({
  id: crypto.randomUUID(),
  statusCode: code,
  statusText: text,
  note: note,
  rawJson: "",
  fields: [],
});

export const DEFAULT_CONFIG: ApiDocConfig = {
  templateType: "get",
  apiMeta: {
    title: "",
    description: "",
    url: "",
    method: "GET",
  },
  routeParams: [],
  queryParams: [],
  urlExamples: [],
  requestJsonRaw: "",
  requestFields: [],
  responses: [
    createDefaultResponse(200, "Success"),
    createDefaultResponse(404, "Not Found", "讀取 message"),
  ],
};

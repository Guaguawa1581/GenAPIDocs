import { ParamDef } from "../types";

/**
 * Parses a URL string to extract path parameters and query parameters.
 * Path parameters are identified by {paramName} syntax.
 * Query parameters are identified from the query string (e.g., ?a=1&b=2).
 */
export function parseUrl(url: string): {
  pathParams: ParamDef[];
  queryParams: ParamDef[];
} {
  const pathParams: ParamDef[] = [];
  const queryParams: ParamDef[] = [];

  if (!url) return { pathParams, queryParams };

  // 1. Extract path parameters {xxx}
  const pathMatches = url.match(/\{[a-zA-Z0-9_-]+\}/g);
  if (pathMatches) {
    const uniquePaths = new Set(pathMatches.map((m) => m.slice(1, -1)));
    uniquePaths.forEach((name) => {
      pathParams.push({
        name,
        description: "",
        example: "",
        showInDesc: true,
        includeInUrl: true,
      });
    });
  }

  // 2. Extract query parameters
  try {
    const urlObj = new URL(
      url.startsWith("http") ? url : `http://localhost/${url}`,
    );
    urlObj.searchParams.forEach((value, name) => {
      queryParams.push({
        name,
        description: "",
        example: value || "",
        showInDesc: true,
        includeInUrl: true,
      });
    });
  } catch (e) {
    const queryIndex = url.indexOf("?");
    if (queryIndex !== -1) {
      const queryString = url.slice(queryIndex + 1);
      const pairs = queryString.split("&");
      pairs.forEach((pair) => {
        const [name, value] = pair.split("=");
        if (name) {
          queryParams.push({
            name,
            description: "",
            example: value || "",
            showInDesc: true,
            includeInUrl: true,
          });
        }
      });
    }
  }

  return { pathParams, queryParams };
}

/**
 * Generates a URL string by replacing {params} and adding query strings based on examples.
 */
export function generateUrlExample(
  baseUrlTemplate: string,
  pathParams: ParamDef[],
  queryParams: ParamDef[],
): string {
  let url = baseUrlTemplate.split("?")[0]; // Start with base path

  // Replace {xxx}
  pathParams
    .filter((p) => p.includeInUrl !== false)
    .forEach((p) => {
      const replacement = p.example || `{${p.name}}`;
      url = url.replace(`{${p.name}}`, replacement);
    });

  // Add query params
  const actualQueryParams = queryParams.filter((p) => p.includeInUrl !== false);

  if (actualQueryParams.length > 0) {
    const qs = actualQueryParams
      .map((p) => `${p.name}=${p.example || `<${p.name}>`}`)
      .join("&");
    url += "?" + qs;
  }

  return url;
}

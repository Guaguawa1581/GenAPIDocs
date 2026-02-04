import { describe, it, expect } from 'vitest';
import { parseUrl } from '../parseUrl';

describe('parseUrl', () => {
  it('should extract path parameters correctly', () => {
    const url = 'api/Client/{moduleCode}/redo/{workOrderLogID}';
    const result = parseUrl(url);
    expect(result.pathParams).toHaveLength(2);
    expect(result.pathParams[0].name).toBe('moduleCode');
    expect(result.pathParams[1].name).toBe('workOrderLogID');
  });

  it('should extract query parameters correctly', () => {
    const url = 'api/test?a=1&b=2';
    const result = parseUrl(url);
    expect(result.queryParams).toHaveLength(2);
    expect(result.queryParams[0].name).toBe('a');
    expect(result.queryParams[0].example).toBe('1');
    expect(result.queryParams[1].name).toBe('b');
    expect(result.queryParams[1].example).toBe('2');
  });

  it('should handle complex URLs', () => {
    const url = 'http://example.com/api/{id}/save?token=xyz&debug=true';
    const result = parseUrl(url);
    expect(result.pathParams[0].name).toBe('id');
    expect(result.queryParams).toHaveLength(2);
    expect(result.queryParams[0].name).toBe('token');
    expect(result.queryParams[1].name).toBe('debug');
  });
});

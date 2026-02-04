import { FieldDef } from '../types';

/**
 * Parses request JSON to extract fields with level markers (~).
 * Root can be an object or an array.
 */
export function parseRequestJson(jsonStr: string): FieldDef[] {
  const fields: FieldDef[] = [];
  try {
    let obj = JSON.parse(jsonStr);
    
    // Handle root array
    if (Array.isArray(obj)) {
      obj = obj[0];
    }

    if (typeof obj !== 'object' || obj === null) return [];

    const traverse = (data: any, level: number) => {
      if (typeof data !== 'object' || data === null) return;

      for (const key in data) {
        const value = data[key];
        const prefix = '~'.repeat(level);
        const type = Array.isArray(value) ? 'array' : typeof value;

        fields.push({
          name: key, // The Excel will prepend the prefix if needed, or we store it in name
          level,
          type,
          example: type === 'object' || type === 'array' ? '' : String(value),
          description: '',
          required: false
        });

        if (type === 'object' && value !== null) {
          traverse(value, level + 1);
        } else if (type === 'array' && value.length > 0) {
          if (typeof value[0] === 'object' && value[0] !== null) {
            traverse(value[0], level + 1);
          }
        }
      }
    };

    traverse(obj, 0);
  } catch (e) {
    console.warn('Invalid Request JSON', e);
  }
  return fields;
}

/**
 * Parses response JSON to extract first-layer fields of records[0].
 */
export function parseResponseJson(jsonStr: string): FieldDef[] {
  const fields: FieldDef[] = [];
  try {
    const obj = JSON.parse(jsonStr);
    const records = obj?.records;

    if (Array.isArray(records) && records.length > 0) {
      const firstRecord = records[0];
      for (const key in firstRecord) {
        const value = firstRecord[key];
        fields.push({
          name: key,
          type: typeof value,
          example: typeof value === 'object' ? JSON.stringify(value) : String(value),
          description: ''
        });
      }
    }
  } catch (e) {
    console.warn('Invalid Response JSON', e);
  }
  return fields;
}

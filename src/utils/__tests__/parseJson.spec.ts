import { describe, it, expect } from 'vitest';
import { parseRequestJson, parseResponseJson } from '../parseJson';

describe('parseJson', () => {
  describe('parseRequestJson', () => {
    it('should flatten nested objects', () => {
      const json = JSON.stringify({
        user: {
          id: 1,
          profile: { name: 'John' }
        }
      });
      const fields = parseRequestJson(json);
      expect(fields.find(f => f.name === 'user.id')).toBeDefined();
      expect(fields.find(f => f.name === 'user.profile.name')).toBeDefined();
    });

    it('should handle arrays with path syntax', () => {
      const json = JSON.stringify({
        items: [{ id: 101, tags: ['a', 'b'] }]
      });
      const fields = parseRequestJson(json);
      expect(fields.find(f => f.name === 'items[].id')).toBeDefined();
      expect(fields.find(f => f.name === 'items[].tags[]')).toBeDefined();
    });
  });

  describe('parseResponseJson', () => {
    it('should extract first layer of records[0]', () => {
      const json = JSON.stringify({
        records: [
          { id: 1, title: 'Test', metadata: { x: 1 } }
        ]
      });
      const fields = parseResponseJson(json);
      expect(fields).toHaveLength(3);
      expect(fields[0].name).toBe('id');
      expect(fields[1].name).toBe('title');
      expect(fields[2].name).toBe('metadata');
      // Should not flatten deep for response as per requirement
      expect(fields.find(f => f.name === 'metadata.x')).toBeUndefined();
    });
  });
});

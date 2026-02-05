import { FieldDef } from '../types';

function generateId() {
    return crypto.randomUUID();
}

/**
 * Universal JSON Parser that returns a recursive FieldDef[] tree.
 */
export function buildFieldTree(obj: any, level: number = 0): FieldDef[] {
    const fields: FieldDef[] = [];
    
    if (typeof obj !== 'object' || obj === null) return [];

    // Handle array root
    if (Array.isArray(obj)) {
        if (obj.length > 0) {
            return buildFieldTree(obj[0], level);
        }
        return [];
    }

    for (const key in obj) {
        const value = obj[key];
        const type = Array.isArray(value) ? 'array' : typeof value;
        const isComplex = type === 'object' || type === 'array';
        
        const field: FieldDef = {
            id: generateId(),
            name: key,
            level,
            type,
            example: isComplex ? '' : String(value),
            description: '',
            isCustom: false,
            expanded: true,
            children: []
        };

        if (type === 'object' && value !== null) {
            field.children = buildFieldTree(value, level + 1);
        } else if (type === 'array' && value.length > 0) {
            if (typeof value[0] === 'object' && value[0] !== null) {
                field.children = buildFieldTree(value[0], level + 1);
            }
        }
        
        fields.push(field);
    }
    
    return fields;
}

/**
 * Flatten a tree for UI components that use flat DataTable but need level info.
 */
export function flattenFields(tree: FieldDef[]): FieldDef[] {
    const result: FieldDef[] = [];
    const traverse = (list: FieldDef[]) => {
        list.forEach(node => {
            result.push(node);
            if (node.children && node.children.length > 0) {
                traverse(node.children);
            }
        });
    };
    traverse(tree);
    return result;
}

/**
 * Helper to rebuild tree from a flat list based on levels.
 * (Useful if we want to convert flat back to tree after flat reordering)
 */
export function unflattenFields(flat: FieldDef[]): FieldDef[] {
    const root: FieldDef[] = [];
    const stack: FieldDef[] = [];

    flat.forEach(item => {
        const node = { ...item, children: [] };
        while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
            stack.pop();
        }
        if (stack.length === 0) {
            root.push(node);
        } else {
            stack[stack.length - 1].children!.push(node);
        }
        stack.push(node);
    });

    return root;
}

export function parseRequestJson(jsonStr: string): FieldDef[] {
    try {
        const obj = JSON.parse(jsonStr);
        return buildFieldTree(obj, 0);
    } catch (e) {
        throw new Error('Invalid Request JSON: ' + (e instanceof Error ? e.message : String(e)));
    }
}

export function parseResponseJson(jsonStr: string): FieldDef[] {
    try {
        const obj = JSON.parse(jsonStr);
        if (obj && Array.isArray(obj.records) && obj.records.length > 0) {
            return buildFieldTree(obj.records[0], 0);
        }
        return buildFieldTree(obj, 0);
    } catch (e) {
        throw new Error('Invalid Response JSON: ' + (e instanceof Error ? e.message : String(e)));
    }
}

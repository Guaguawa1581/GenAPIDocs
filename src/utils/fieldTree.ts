import { FieldDef } from "../types";
import { flattenFields, unflattenFields } from "./parseJson";

export const isComplex = (type: string) => type === "object" || type === "array";

/** Rows that are visible given each object's expanded state */
export function getVisibleFields(fullFlat: FieldDef[]) {
  const visible: FieldDef[] = [];
  let skipUntilLevel: number | null = null;
  for (const f of fullFlat) {
    if (skipUntilLevel !== null) {
      if (f.level! > skipUntilLevel) continue;
      else skipUntilLevel = null;
    }
    visible.push(f);
    if (isComplex(f.type) && !f.expanded) skipUntilLevel = f.level!;
  }
  return visible;
}

export function removeFieldById(list: FieldDef[], id: string): boolean {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      list.splice(i, 1);
      return true;
    }
    if (list[i].children && removeFieldById(list[i].children!, id)) {
      return true;
    }
  }
  return false;
}

export type MoveResult = { tree: FieldDef[] } | { error: string };

/**
 * Move a visible row (with its children) from `dragIndex` to `dropIndex`.
 * Parsed fields may only move within the same parent; custom fields adopt the level of where they land.
 */
export function moveVisibleField(
  tree: FieldDef[],
  dragIndex: number,
  dropIndex: number,
): MoveResult {
  const allFlat = flattenFields(tree);
  const displayed = getVisibleFields(allFlat);

  const sourceRow = displayed[dragIndex];
  const targetRow = displayed[dropIndex];

  const realDragIndex = allFlat.indexOf(sourceRow);
  const groupRows: FieldDef[] = [sourceRow];
  let j = realDragIndex + 1;
  while (j < allFlat.length && allFlat[j].level! > sourceRow.level!) {
    groupRows.push(allFlat[j]);
    j++;
  }

  // Validation
  if (!sourceRow.isCustom) {
    if (targetRow.level !== sourceRow.level) {
      return { error: "非自訂欄位僅能在同階層移動" };
    }
    const startIndex = Math.min(realDragIndex, allFlat.indexOf(targetRow));
    const endIndex = Math.max(realDragIndex, allFlat.indexOf(targetRow));
    for (let k = startIndex + 1; k < endIndex; k++) {
      if (allFlat[k].level! < sourceRow.level!) {
        return { error: "不可跨越父項目" };
      }
    }
  }

  // Perform Move
  allFlat.splice(realDragIndex, groupRows.length);
  const newRealTargetIndex = allFlat.indexOf(targetRow);

  let finalDropIndex = newRealTargetIndex;
  if (dropIndex > dragIndex) {
    let k = newRealTargetIndex + 1;
    while (k < allFlat.length && allFlat[k].level! > targetRow.level!) {
      k++;
    }
    finalDropIndex = k;
  }

  // Smart Level Adoption for Custom Fields
  if (sourceRow.isCustom) {
    const originalLevel = sourceRow.level || 0;
    const prevNode = allFlat[finalDropIndex - 1];
    if (prevNode) {
      // Dropped right after an object -> becomes its child
      sourceRow.level = isComplex(prevNode.type)
        ? prevNode.level! + 1
        : prevNode.level;
    } else {
      sourceRow.level = 0;
    }

    // Update children level relative to parent change
    const diff = sourceRow.level! - originalLevel;
    if (diff !== 0) {
      groupRows.forEach((f) => {
        if (f !== sourceRow) f.level = (f.level || 0) + diff;
      });
    }
  }

  allFlat.splice(finalDropIndex, 0, ...groupRows);
  return { tree: unflattenFields(allFlat) };
}

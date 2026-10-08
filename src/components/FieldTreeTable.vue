<script setup lang="ts">
import { ref, computed } from "vue";
import { flattenFields, unflattenFields } from "../utils/parseJson";
import {
  parseClipboardTable,
  fillDescriptionsDown,
  applyDescriptionsByKey,
} from "../utils/pasteFields";
import { useToast } from "primevue/usetoast";
import { FieldDef } from "../types";
import DataTable, { DataTableRowReorderEvent } from "primevue/datatable";
import Column from "primevue/column";
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import Tag from "primevue/tag";

withDefaults(defineProps<{ scrollHeight?: string }>(), {
  scrollHeight: "500px",
});

const fields = defineModel<FieldDef[]>({ required: true });
const toast = useToast();
const tableWrapper = ref<HTMLElement>();

const isComplex = (type: string) => type === "object" || type === "array";

const getVisibleFields = (fullFlat: FieldDef[]) => {
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
};

const displayedFields = computed(() =>
  getVisibleFields(flattenFields(fields.value)),
);

const toggleExpand = (data: FieldDef) => {
  data.expanded = !data.expanded;
};

const deleteField = (id: string) => {
  const removeRecursive = (list: FieldDef[]): boolean => {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        list.splice(i, 1);
        return true;
      }
      if (list[i].children && removeRecursive(list[i].children as FieldDef[])) {
        return true;
      }
    }
    return false;
  };
  removeRecursive(fields.value);
};

const onRowReorder = (event: DataTableRowReorderEvent) => {
  const { dragIndex, dropIndex } = event;
  if (dragIndex === dropIndex) return;

  let allFlat = flattenFields(fields.value);
  const displayed = getVisibleFields(allFlat);

  const sourceRow = displayed[dragIndex];
  let targetRow = displayed[dropIndex];

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
      toast.add({
        severity: "warn",
        summary: "移動受限",
        detail: "非自訂欄位僅能在同階層移動",
        life: 2000,
      });
      return;
    }
    const startIndex = Math.min(realDragIndex, allFlat.indexOf(targetRow));
    const endIndex = Math.max(realDragIndex, allFlat.indexOf(targetRow));
    for (let k = startIndex + 1; k < endIndex; k++) {
      if (allFlat[k].level! < sourceRow.level!) {
        toast.add({
          severity: "warn",
          summary: "移動受限",
          detail: "不可跨越父項目",
          life: 2000,
        });
        return;
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
    const prevNode = allFlat[finalDropIndex - 1];
    if (prevNode) {
      // "level0跟level1之間自訂會變level1" -> if dropped after level 0 parent, it becomes level 1
      if (isComplex(prevNode.type)) {
        sourceRow.level = prevNode.level! + 1;
      } else {
        sourceRow.level = prevNode.level;
      }
    } else {
      sourceRow.level = 0;
    }

    // Update children level relative to parent change
    const diff = sourceRow.level! - (groupRows[0].level || 0);
    if (diff !== 0) {
      groupRows.forEach((f) => {
        if (f !== sourceRow) f.level = (f.level || 0) + diff;
      });
    }
  }

  allFlat.splice(finalDropIndex, 0, ...groupRows);
  fields.value = unflattenFields(allFlat);
};

// Excel-like paste: one column fills downward, "key + description" columns match by key
const onDescriptionPaste = (event: ClipboardEvent, rowIndex: number) => {
  const text = event.clipboardData?.getData("text/plain") ?? "";
  const rows = parseClipboardTable(text);
  const isMultiColumn = rows.some((r) => r.length > 1);
  // Single value: keep the browser's normal paste
  if (rows.length <= 1 && !isMultiColumn) return;

  event.preventDefault();

  if (isMultiColumn) {
    const { matched, unmatched } = applyDescriptionsByKey(fields.value, rows);
    if (matched === 0) {
      toast.add({
        severity: "warn",
        summary: "貼上失敗",
        detail: "第一欄找不到對應的欄位名稱",
        life: 3000,
      });
      return;
    }
    const preview = unmatched.slice(0, 5).join(", ");
    toast.add({
      severity: unmatched.length ? "warn" : "success",
      summary: "依欄位名稱貼上",
      detail: unmatched.length
        ? `已對應 ${matched} 筆，未對應 ${unmatched.length} 筆：${preview}${unmatched.length > 5 ? "…" : ""}`
        : `已對應 ${matched} 筆說明`,
      life: 3000,
    });
    return;
  }

  const { applied, skipped } = fillDescriptionsDown(
    displayedFields.value,
    rowIndex,
    rows.map((r) => r[0]),
  );
  toast.add({
    severity: skipped ? "warn" : "success",
    summary: "已貼上說明",
    detail: skipped
      ? `已填入 ${applied} 筆，超出 ${skipped} 筆已略過`
      : `已填入 ${applied} 筆`,
    life: 2000,
  });
};

const focusCell = (col: string, rowIndex: number) => {
  const el = tableWrapper.value?.querySelector<HTMLInputElement>(
    `input[data-col="${col}"][data-row="${rowIndex}"]`,
  );
  if (!el) return;
  el.focus();
  el.select();
};

// Enter / ↓ moves to the next row, Shift+Enter / ↑ moves to the previous row
const onCellKeydown = (event: KeyboardEvent, col: string, rowIndex: number) => {
  if (event.isComposing) return; // Don't hijack Enter while an IME is composing
  if (event.key === "ArrowDown" || (event.key === "Enter" && !event.shiftKey)) {
    event.preventDefault();
    focusCell(col, rowIndex + 1);
  } else if (
    event.key === "ArrowUp" ||
    (event.key === "Enter" && event.shiftKey)
  ) {
    event.preventDefault();
    focusCell(col, rowIndex - 1);
  }
};
</script>

<template>
  <div ref="tableWrapper">
    <DataTable
      :value="displayedFields"
      size="small"
      scrollable
      :scrollHeight="scrollHeight"
      class="text-left border rounded shadow-sm"
      @row-reorder="onRowReorder"
      dataKey="id"
    >
      <Column rowReorder headerStyle="width: 3rem" />
      <Column header="欄位名稱 (Key)" style="min-width: 12rem">
        <template #body="{ data, index }">
          <div
            :style="{ paddingLeft: data.level * 1.5 + 'rem' }"
            class="d-flex align-items-center gap-1"
          >
            <Button
              v-if="isComplex(data.type)"
              :icon="
                data.expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'
              "
              variant="text"
              class="p-0"
              style="width: 1.25rem; height: 1.25rem; flex-shrink: 0"
              @click="toggleExpand(data)"
            />
            <span
              v-else-if="data.level > 0"
              class="me-1 text-secondary opacity-50"
              >└</span
            >

            <div class="position-relative w-100">
              <InputText
                v-model="data.name"
                class="p-1 font-monospace w-100 border-0 bg-transparent edit-focus"
                data-col="name"
                :data-row="index"
                @keydown="onCellKeydown($event, 'name', index)"
              />
              <div class="bottom-line"></div>
            </div>
            <Tag
              v-if="isComplex(data.type)"
              severity="info"
              size="small"
              value="Obj"
            />
            <Tag
              v-if="data.isCustom"
              severity="warn"
              size="small"
              value="User"
            />
          </div>
        </template>
      </Column>
      <Column header="意思 (Description)" style="width: 18rem">
        <template #body="{ data, index }">
          <InputText
            v-model="data.description"
            class="w-100 p-1 border-0 border-bottom rounded-0"
            placeholder="說明文字"
            data-col="desc"
            :data-row="index"
            @keydown="onCellKeydown($event, 'desc', index)"
            @paste="onDescriptionPaste($event, index)"
          />
        </template>
      </Column>
      <Column header="操作" style="width: 4rem">
        <template #body="{ data }">
          <Button
            icon="pi pi-trash"
            variant="text"
            severity="danger"
            size="small"
            @click="deleteField(data.id)"
          />
        </template>
      </Column>
    </DataTable>

    <div class="mt-3 p-2 bg-light border rounded small text-secondary">
      💡 從 Excel 複製一整欄說明，貼到任一「意思」欄位，會從該列往下依序填入；
      複製「欄位名稱、說明」兩欄則依欄位名稱自動對應（不受順序影響）。 Enter / ↑
      ↓ 可上下切換列，拖曳 ☰ 調整順序，自訂欄位移至物件下方會自動併入該物件。
    </div>
  </div>
</template>

<style scoped>
.border {
  border: 1px solid #e2e8f0;
}
.rounded {
  border-radius: 8px;
}

.font-monospace {
  font-size: 0.85rem;
}

.edit-focus:focus {
  box-shadow: none;
  background: rgba(59, 130, 246, 0.05) !important;
}

.bottom-line {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: #e2e8f0;
}

:deep(.p-datatable-reorderler-handle) {
  cursor: grab;
  color: #94a3b8;
}
</style>

<script setup lang="ts">
import { computed } from "vue";
import { useDraftStore } from "../../stores/draft";
import {
  parseRequestJson,
  flattenFields,
  unflattenFields,
} from "../../utils/parseJson";
import { useToast } from "primevue/usetoast";
import { FieldDef } from "../../types";
import Textarea from "primevue/textarea";
import DataTable, { DataTableRowReorderEvent } from "primevue/datatable";
import Column from "primevue/column";
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import Tag from "primevue/tag";

const draftStore = useDraftStore();
const toast = useToast();

const isComplex = (type: string) => type === "object" || type === "array";

const handleRequestChange = (isManual = false) => {
  const currentTree = draftStore.config.requestFields;
  const raw = draftStore.config.requestJsonRaw;

  if (raw && (currentTree.length === 0 || isManual)) {
    try {
      const newTree = parseRequestJson(raw);

      // Merge descriptions by flattening both and comparing names
      const currentFlat = flattenFields(currentTree);
      const existingMap = new Map(
        currentFlat.map((f) => [f.name, f.description]),
      );

      const flattenAndMerge = (list: FieldDef[]) => {
        list.forEach((f) => {
          if (existingMap.has(f.name)) {
            f.description = existingMap.get(f.name)!;
          }
          if (f.children && f.children.length > 0) {
            flattenAndMerge(f.children);
          }
        });
      };
      flattenAndMerge(newTree);

      draftStore.config.requestFields = newTree;
      if (isManual) {
        toast.add({
          severity: "info",
          summary: "解析完成",
          detail: "已重新根據 JSON 刷新欄位",
          life: 2000,
        });
      }
    } catch (e) {
      toast.add({
        severity: "error",
        summary: "解析失敗",
        detail: (e as Error).message,
        life: 3000,
      });
    }
  }
};

const deleteField = (id: string) => {
  // Operations on tree are hard, so we flatten, remove, and unflatten
  const allFlat = flattenFields(draftStore.config.requestFields);
  const index = allFlat.findIndex((f) => f.id === id);
  if (index === -1) return;

  const target = allFlat[index];
  let count = 1;
  while (
    index + count < allFlat.length &&
    allFlat[index + count].level! > target.level!
  ) {
    count++;
  }
  allFlat.splice(index, count);
  draftStore.config.requestFields = unflattenFields(allFlat);
};

const addCustomField = () => {
  // Add to the root level
  draftStore.config.requestFields.push({
    id: crypto.randomUUID(),
    name: "new_field",
    type: "string",
    example: "",
    description: "",
    level: 0,
    expanded: true,
    isCustom: true,
    children: [],
  });
};

const toggleExpand = (data: FieldDef) => {
  data.expanded = !data.expanded;
};

const onRowReorder = (event: DataTableRowReorderEvent) => {
  const { dragIndex, dropIndex } = event;
  if (dragIndex === dropIndex) return;

  let allFlat = flattenFields(draftStore.config.requestFields);
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
  draftStore.config.requestFields = unflattenFields(allFlat);
};

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
  getVisibleFields(flattenFields(draftStore.config.requestFields)),
);
</script>

<template>
  <div class="step-container mw-100">
    <h2>Step 3: JSON BODY (Request)</h2>

    <div class="split-layout mt-3">
      <div class="json-side">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <label class="fw-bold">Request JSON 範例</label>
          <Button
            label="重新解析欄位"
            icon="pi pi-refresh"
            size="small"
            variant="text"
            @click="handleRequestChange(true)"
          />
        </div>
        <Textarea
          v-model="draftStore.config.requestJsonRaw"
          rows="22"
          class="w-100 font-monospace border-primary-subtle shadow-sm"
          placeholder='{ "id": 1, "data": { "name": "test" } }'
          @blur="handleRequestChange(false)"
        />
      </div>

      <div class="fields-side">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <label class="fw-bold">Request 欄位結構 (階層編輯)</label>
          <Button
            label="新增自訂欄位"
            icon="pi pi-plus-circle"
            size="small"
            text
            @click="addCustomField"
          />
        </div>

        <DataTable
          :value="displayedFields"
          size="small"
          scrollable
          scrollHeight="550px"
          class="text-left border rounded shadow-sm"
          @row-reorder="onRowReorder"
          dataKey="id"
        >
          <Column rowReorder headerStyle="width: 3rem" />
          <Column header="欄位名稱 (Key)" style="min-width: 12rem">
            <template #body="{ data }">
              <div
                :style="{ paddingLeft: data.level * 0.5 + 'rem' }"
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
          <!-- <Column field="type" header="型態" style="width: 6rem">
            <template #body="{ data }">
              <span class="small text-secondary">{{ data.type }}</span>
            </template>
          </Column> -->
          <Column header="意思 (Description)" style="width: 18rem">
            <template #body="{ data }">
              <InputText
                v-model="data.description"
                class="w-100 p-1 border-0 border-bottom rounded-0"
                placeholder="說明文字"
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
          💡 自訂欄位移至物件下方會自動併入該物件。目前儲存結構：TreeNode {
          children: [] }。
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mw-100 {
  max-width: 1400px;
  width: 100%;
}

.split-layout {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 2rem;
  align-items: start;
}

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

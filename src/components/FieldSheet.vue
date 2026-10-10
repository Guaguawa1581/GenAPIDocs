<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import VGrid, {
  type ColumnRegular,
  type ColumnDataSchemaModel,
  type HyperFunc,
  type VNode,
  type BeforeSaveDataDetails,
  type BeforeRangeSaveDataDetails,
  type RevoGridCustomEvent,
} from "@revolist/vue3-datagrid";
import { useToast } from "primevue/usetoast";
import { FieldDef } from "../types";
import { flattenFields } from "../utils/parseJson";
import {
  isComplex,
  getVisibleFields,
  removeFieldById,
  moveVisibleField,
} from "../utils/fieldTree";
import { applyDescriptionsByKey } from "../utils/pasteFields";

const props = withDefaults(defineProps<{ scrollHeight?: string }>(), {
  scrollHeight: "500px",
});

const fields = defineModel<FieldDef[]>({ required: true });
const toast = useToast();
const wrapper = ref<HTMLElement>();

type SheetRow = Pick<
  FieldDef,
  "id" | "name" | "description" | "level" | "type" | "isCustom" | "expanded"
>;
type EditableProp = "name" | "description";
const EDITABLE: EditableProp[] = ["name", "description"];

const fieldById = computed(
  () => new Map(flattenFields(fields.value).map((f) => [f.id, f])),
);

// The grid gets plain copies; every edit is written back to the store through fieldById
const rows = computed<SheetRow[]>(() =>
  getVisibleFields(flattenFields(fields.value)).map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description ?? "",
    level: f.level ?? 0,
    type: f.type,
    isCustom: !!f.isCustom,
    expanded: !!f.expanded,
  })),
);

const applyRowEdit = (id: string, values: Partial<Record<string, unknown>>) => {
  const target = fieldById.value.get(id);
  if (!target) return;
  EDITABLE.forEach((prop) => {
    if (prop in values) target[prop] = String(values[prop] ?? "").trim();
  });
};

const onBeforeEdit = (e: RevoGridCustomEvent<BeforeSaveDataDetails>) => {
  e.preventDefault();
  const { model, prop, val } = e.detail;
  applyRowEdit((model as SheetRow).id, { [prop]: val });
};

// Paste, autofill and clearing a selection all arrive as a range edit
const onBeforeRangeEdit = (
  e: RevoGridCustomEvent<BeforeRangeSaveDataDetails>,
) => {
  e.preventDefault();
  const { data, models } = e.detail;
  Object.entries(data).forEach(([rowIndex, values]) => {
    const model = (models[+rowIndex] ?? rows.value[+rowIndex]) as
      | SheetRow
      | undefined;
    if (model) applyRowEdit(model.id, values);
  });
};

// "key + description" columns match by key wherever they are pasted
const onBeforePasteApply = (e: Event) => {
  const { parsed } = (e as CustomEvent<{ parsed: string[][] }>).detail;
  if (!parsed.some((r) => r.length > 1)) return; // single column: normal paste

  e.preventDefault();
  const { matched, unmatched } = applyDescriptionsByKey(fields.value, parsed);
  // An unmatched first row is most likely the header (e.g. 參數 / 意思)
  const header = (parsed[0]?.[0] ?? "").trim();
  if (header && unmatched[0] === header) unmatched.shift();

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
};

const onRowOrderChanged = (
  e: RevoGridCustomEvent<{ from: number; to: number }>,
) => {
  // The tree decides the final order; the grid re-renders from the new source
  e.preventDefault();
  const { from, to } = e.detail;
  if (from === to) return;

  const result = moveVisibleField(fields.value, from, to);
  if ("error" in result) {
    toast.add({
      severity: "warn",
      summary: "移動受限",
      detail: result.error,
      life: 2000,
    });
    return;
  }
  fields.value = result.tree;
};

const toggleExpand = (id: string) => {
  const target = fieldById.value.get(id);
  if (target) target.expanded = !target.expanded;
};

const renderName = (h: HyperFunc<VNode>, p: ColumnDataSchemaModel) => {
  const row = p.model as SheetRow;
  const complex = isComplex(row.type);
  return h(
    "div",
    { class: "sheet-name", style: { paddingLeft: `${row.level * 1.25}rem` } },
    [
      complex
        ? h("i", {
            class: `sheet-toggle pi ${row.expanded ? "pi-chevron-down" : "pi-chevron-right"}`,
            onMouseDown: (ev: MouseEvent) => ev.stopPropagation(),
            onClick: () => toggleExpand(row.id),
          })
        : h("span", { class: "sheet-branch" }, row.level > 0 ? "└" : ""),
      h("span", { class: "sheet-key" }, row.name),
      complex ? h("span", { class: "sheet-tag sheet-tag-obj" }, "Obj") : null,
      row.isCustom ? h("span", { class: "sheet-tag sheet-tag-user" }, "User") : null,
    ],
  );
};

const renderDelete = (h: HyperFunc<VNode>, p: ColumnDataSchemaModel) =>
  h(
    "button",
    {
      class: "sheet-delete",
      title: "刪除欄位",
      onMouseDown: (ev: MouseEvent) => ev.stopPropagation(),
      onClick: () => removeFieldById(fields.value, (p.model as SheetRow).id),
    },
    h("i", { class: "pi pi-trash" }),
  );

const columns: ColumnRegular[] = [
  {
    prop: "drag",
    name: "",
    size: 48,
    rowDrag: true,
    readonly: true,
    cellProperties: () => ({ class: "sheet-drag-cell" }),
  },
  {
    prop: "name",
    name: "欄位名稱 (Key)",
    size: 280,
    cellTemplate: renderName,
  },
  { prop: "description", name: "意思 (Description)", size: 340 },
  {
    prop: "actions",
    name: "操作",
    size: 72,
    readonly: true,
    cellTemplate: renderDelete,
  },
];

// beforepasteapply comes from the grid's inner clipboard element and bubbles up
onMounted(() =>
  wrapper.value?.addEventListener("beforepasteapply", onBeforePasteApply),
);
onBeforeUnmount(() =>
  wrapper.value?.removeEventListener("beforepasteapply", onBeforePasteApply),
);
</script>

<template>
  <div>
    <div
      ref="wrapper"
      class="sheet-wrapper border rounded shadow-sm"
      :style="{ height: props.scrollHeight }"
    >
      <VGrid
        :source="rows"
        :columns="columns"
        theme="compact"
        :row-size="36"
        range
        resize
        hide-attribution
        @beforeedit="onBeforeEdit"
        @beforerangeedit="onBeforeRangeEdit"
        @roworderchanged="onRowOrderChanged"
      />
    </div>

    <div class="mt-3 p-2 bg-light border rounded small text-secondary">
      💡 操作方式同 Excel：可框選多格、Ctrl+C / Ctrl+V、拖曳右下角填滿、Delete
      清除。從 Excel 複製「欄位名稱、說明」兩欄貼到任一格，會依欄位名稱自動對應說明（不受順序影響，標題列會自動略過）；
      只複製一欄則從選取的格子往下填入。拖曳左側 ☰ 調整順序，自訂欄位移至物件下方會自動併入該物件。
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

.sheet-wrapper {
  overflow: hidden;
  text-align: left;
}

:deep(.sheet-name) {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  height: 100%;
}

:deep(.sheet-toggle) {
  cursor: pointer;
  font-size: 0.75rem;
  color: #64748b;
  width: 1rem;
  flex-shrink: 0;
}

:deep(.sheet-branch) {
  color: #94a3b8;
  width: 1rem;
  flex-shrink: 0;
}

:deep(.sheet-key) {
  font-family: var(--bs-font-monospace, monospace);
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.sheet-tag) {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0 0.35rem;
  border-radius: 4px;
  line-height: 1.4;
  flex-shrink: 0;
}
:deep(.sheet-tag-obj) {
  background: #e0f2fe;
  color: #0369a1;
}
:deep(.sheet-tag-user) {
  background: #ffedd5;
  color: #c2410c;
}

:deep(.sheet-drag-cell) {
  text-overflow: clip;
  padding: 0;
  text-align: center;
}

:deep(.sheet-delete) {
  border: 0;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem;
}
:deep(.sheet-delete:hover) {
  color: #b91c1c;
}
</style>

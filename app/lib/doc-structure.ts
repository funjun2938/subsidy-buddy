import type { FormDoc } from "./form-doc";
import { findLabelTargets } from "./fill-core";

export interface StructureCell {
  ref: string; row: number; col: number;
  label: string; isFillable: boolean; labelFor?: string;
}
export interface StructureTable { index: number; nrows: number; ncols: number; cells: StructureCell[]; }
export interface DocStructure {
  format: "hwp" | "hwpx"; title?: string;
  tables: StructureTable[];
}
export type ValueMap = Record<string, string>;

const cellRef = (ti: number, row: number, col: number) => `t${ti}.r${row}.c${col}`;

export function buildStructure(doc: FormDoc): DocStructure {
  const targets = findLabelTargets(doc); // FormCell 동일성으로 fillable 판정
  const targetInfo = new Map<unknown, string>(); // targetCell → labelFor
  for (const t of targets) targetInfo.set(t.targetCell, t.label);

  const tables: StructureTable[] = [];
  let ti = 0;
  for (const table of doc.allTables()) {
    const cells: StructureCell[] = table.cells.map((c) => ({
      ref: cellRef(ti, c.row, c.col),
      row: c.row, col: c.col,
      label: c.text,
      isFillable: targetInfo.has(c),
      labelFor: targetInfo.get(c),
    }));
    tables.push({ index: ti, nrows: table.nrows, ncols: table.ncols, cells });
    ti++;
  }
  return { format: doc.format, tables };
}

const REF_RE = /^t(\d+)\.r(\d+)\.c(\d+)$/;

export async function applyValues(doc: FormDoc, values: ValueMap): Promise<Uint8Array> {
  const tables = [...doc.allTables()];
  for (const [ref, value] of Object.entries(values)) {
    const m = REF_RE.exec(ref);
    if (!m) continue;
    const ti = +m[1], row = +m[2], col = +m[3];
    const cell = tables[ti]?.cellAt(row, col);
    if (cell) cell.setText(value);
  }
  return doc.toBytes();
}

export interface CellChange { ref: string; value: string; }
export function filterChanges(changes: CellChange[], fillable: Set<string>): CellChange[] {
  return changes.filter(c => typeof c?.ref === "string" && typeof c?.value === "string" && fillable.has(c.ref));
}

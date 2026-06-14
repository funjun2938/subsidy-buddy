// rhwp(@rhwp/core) 문서에 직접 값을 써넣는다 — 렌더와 동일 엔진으로 채워서
// "원문 미리보기"가 항상 칸편집 값과 일치하도록 보장한다 (export 라운드트립 제거).
//
// 왜 필요한가: hwpilot(편집 엔진)의 export 가 일부 실제 양식에서
// `paragraph_completeness: PARA_LINE_SEG` 검증 오류로 throw → /api/doc/export 500
// → 채운 바이트가 null → 미리보기는 빈 원본으로 폴백. (확인된 근본 원인 H1)
//
// rhwp 의 표/셀 분절은 hwpilot 과 다르므로 ref(tN.rR.cC)로 매칭하지 않고
// **라벨 텍스트**로 매칭한다(fill-core.pickTarget 과 동일한 우측→아래→우측의우측 우선순위).
// 클라이언트 전용(WASM). insertTextInCell + renderPageSvg 가 같은 엔진이라 렌더 보장.

import type { HwpDocument } from "@rhwp/core";
import { normalize, isPlaceholderValue } from "./fill-core";

// 채울 라벨→값 쌍 (page 에서 structure+valueMap 으로 만든다).
export interface RhwpFill {
  label: string;
  value: string;
}

// rhwp 셀(평탄화된 표 좌표). cell 은 insertTextInCell 의 cell_idx.
interface RCell {
  cell: number;
  row: number;
  col: number;
  text: string;
  uid: string; // 표 전역 유일 id (cell_idx 는 표 내에서만 유일하므로)
}
interface RTable {
  sec: number;
  para: number;
  ctrl: number;
  cells: RCell[];
  grid: Map<string, RCell>; // "row,col" → cell
}

const rc = (row: number, col: number) => `${row},${col}`;

// rhwp 문서의 모든 표를 열거한다. (구역→문단→컨트롤 인덱스 0..N 를 표로 시도)
function enumerateTables(doc: HwpDocument): RTable[] {
  const tables: RTable[] = [];
  const secCount = doc.getSectionCount();
  for (let sec = 0; sec < secCount; sec++) {
    const paraCount = doc.getParagraphCount(sec);
    for (let para = 0; para < paraCount; para++) {
      // 한 문단에 표가 여러 개일 수 있어 control_idx 를 0부터 올려가며 시도.
      // getTableDimensions 가 표가 아니거나 없으면 throw → break.
      for (let ctrl = 0; ctrl < 8; ctrl++) {
        let dim: { cellCount?: number };
        try {
          dim = JSON.parse(doc.getTableDimensions(sec, para, ctrl));
        } catch {
          break;
        }
        if (!dim || !dim.cellCount) break;
        const cells: RCell[] = [];
        const grid = new Map<string, RCell>();
        for (let cell = 0; cell < dim.cellCount; cell++) {
          let row = -1, col = -1;
          try {
            const info = JSON.parse(doc.getCellInfo(sec, para, ctrl, cell));
            row = info.row; col = info.col;
          } catch { /* 좌표 조회 실패 셀은 grid 에서 제외 */ }
          let text = "";
          try { text = doc.getTextInCell(sec, para, ctrl, cell, 0, 0, 9999) || ""; } catch { /* 빈 셀 */ }
          const rcell: RCell = { cell, row, col, text, uid: `${sec}.${para}.${ctrl}.${cell}` };
          cells.push(rcell);
          if (row >= 0 && col >= 0) grid.set(rc(row, col), rcell);
        }
        tables.push({ sec, para, ctrl, cells, grid });
      }
    }
  }
  return tables;
}

// 라벨 셀의 값 입력 대상(인접 셀) 선택 — fill-core.pickTarget 과 동일 우선순위.
// labelNorms: 이 양식의 알려진 라벨 정규화 집합(=다른 라벨칸을 타깃에서 제외하기 위함).
function pickTarget(table: RTable, label: RCell, used: Set<string>, labelNorms: Set<string>): RCell | null {
  const candidates: { base: number; cell: RCell; empty: boolean }[] = [];
  const add = (cell: RCell | undefined, base: number) => {
    if (!cell || cell === label || used.has(cell.uid)) return;
    const t = cell.text.trim();
    // 값칸이 아니라 '또 다른 라벨'(이 양식의 알려진 라벨)인 비어있지 않은 칸은 타깃 제외.
    // (fill-core.pickTarget 의 resolver.resolve(t)!==null 와 동일 취지)
    if (t && labelNorms.has(normalize(t))) return;
    candidates.push({ base, cell, empty: !t || isPlaceholderValue(t) });
  };
  const right = table.grid.get(rc(label.row, label.col + 1));
  add(right, 10);
  add(table.grid.get(rc(label.row + 1, label.col)), 5);
  if (right) add(table.grid.get(rc(right.row, right.col + 1)), 1);
  if (candidates.length === 0) return null;
  const empties = candidates.filter((c) => c.empty);
  const pool = empties.length ? empties : candidates;
  pool.sort((a, b) => b.base - a.base);
  return pool[0].cell;
}

// 라벨로 rhwp 표/라벨셀을 찾는다. 정규화 완전일치 우선, 없으면 포함(4자↑·50%↑).
// usedLabels: 이미 소비한 라벨셀(같은 라벨 여러 값이 같은 칸을 가리키지 않게).
function findLabelCell(tables: RTable[], label: string, usedLabels: Set<string>): { table: RTable; cell: RCell } | null {
  const norm = normalize(label);
  if (!norm) return null;
  let partial: { table: RTable; cell: RCell } | null = null;
  for (const table of tables) {
    for (const cell of table.cells) {
      if (cell.row < 0 || cell.col < 0 || usedLabels.has(cell.uid)) continue;
      const cn = normalize(cell.text);
      if (!cn) continue;
      if (cn === norm) return { table, cell };
      if (!partial && norm.length >= 4 && cn.length >= 4) {
        const shorter = norm.length <= cn.length ? norm : cn;
        const longer = norm.length <= cn.length ? cn : norm;
        if (longer.includes(shorter) && shorter.length >= longer.length * 0.5) {
          partial = { table, cell };
        }
      }
    }
  }
  return partial;
}

// fills 를 rhwp 문서에 직접 적용한다(in place). 적용된 칸 수 반환.
// 셀에 기존 텍스트가 있으면 지우고 새 값으로 덮어쓴다.
export function applyFillsToRhwp(doc: HwpDocument, fills: RhwpFill[]): number {
  const tables = enumerateTables(doc);
  if (tables.length === 0) return 0;
  const labelNorms = new Set(fills.map((f) => normalize(f.label)).filter(Boolean));
  const usedTargets = new Set<string>(); // 타깃 셀 uid (표 전역 유일)
  const usedLabels = new Set<string>();   // 라벨 셀 uid (같은 라벨 중복 매칭 방지)
  let applied = 0;

  for (const { label, value } of fills) {
    if (!value || !value.trim()) continue;
    const hit = findLabelCell(tables, label, usedLabels);
    if (!hit) continue;
    const target = pickTarget(hit.table, hit.cell, usedTargets, labelNorms);
    if (!target) continue;
    usedLabels.add(hit.cell.uid);
    const { sec, para, ctrl } = hit.table;
    try {
      // 기존 텍스트(플레이스홀더 등) 제거 후 입력.
      // 삭제 count 는 rhwp 의 코드포인트 단위에 맞춰 [...] 로 센다(이모지/보충문자 안전).
      const existing = target.text || "";
      const existingLen = [...existing].length;
      if (existingLen > 0) {
        doc.deleteTextInCell(sec, para, ctrl, target.cell, 0, 0, existingLen);
      }
      doc.insertTextInCell(sec, para, ctrl, target.cell, 0, 0, value);
      usedTargets.add(target.uid);
      target.text = value;
      applied++;
    } catch { /* 개별 셀 실패는 무시하고 계속 */ }
  }
  return applied;
}

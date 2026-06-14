// 양식 표 셀 라벨 → 인접 셀 값 주입 (포맷 무관 코어).
//
// 원래 lib/hwpx-filler.ts 에 있던 HWPX 전용 로직에서 포맷 의존성을 걷어내고
// FormDoc/FormTable/FormCell (lib/form-doc.ts) 인터페이스 위에서만 동작하도록
// 일반화했다. HWPX/HWP 어댑터가 이 코어를 공유한다.

import type { FormCell, FormDoc, FormTable } from "./form-doc";
import { LABEL_MAP } from "./label-map";

export interface FillReport {
  filled_count: number;
  filled: { label: string; field: string | null; value: string }[];
  unmatched_labels: string[];
  unknown_cells: string[];
}

// ── 라벨 정규화 + 매칭 ───────────────────────────────────────────────────────

export function normalize(s: string): string {
  return s.replace(/[\s:：·\-_,.()\[\]/]+/g, "").toLowerCase();
}

function looksLikeLabel(text: string): boolean {
  if (!text || text.length > 40) return false;
  if (/[.?!]$/.test(text)) return false;
  if (!/[가-힣A-Za-z]/.test(text)) return false;
  return true;
}

// 칸의 현재 텍스트가 '실제 값'이 아니라 '작성 예시/안내/플레이스홀더'인지 판별.
// 이런 칸은 빈칸처럼 취급해 타깃으로 잡고, 예시 형식을 참고해 실제 값으로 덮어쓴다.
export function isPlaceholderValue(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return true;
  if (t.length > 60) return false; // 너무 길면 실제 내용일 가능성
  if (/^[\s\-–—－~·.,'"]+$/.test(t)) return true;                          // 대시/구두점만
  if (/^[\sㅇ○◯oOxX□◻▢●◇*＊·•]+$/.test(t)) return true;             // ㅇㅇ/○○/XX/□□ 등 반복 기호
  if (/^\(?\s*(인|날인|서명|서명\s*또는\s*인)\s*\)?$/.test(t)) return true; // (인)/서명 또는 인
  if (/예\s*\(\s*\)\s*[,·/]?\s*아니[오요]\s*\(\s*\)/.test(t)) return true;  // 예( ), 아니오( ) 체크박스
  // 작성 예시/형식 안내 마커
  if (/\(\s*행정리\s*\)|읍\s*[.·]?\s*면\s*[.·]?\s*동|도로명\s*건물번호|\(\s*예\s*[:：]|예\s*[:：]\s*\S|기재\s*하?세요|입력\s*하?세요|작성\s*예시|예시\s*[:：]/.test(t)) return true;
  return false;
}

class LabelResolver {
  private exact = new Map<string, string>();
  readonly fields = LABEL_MAP;

  constructor() {
    for (const [fieldKey, labels] of Object.entries(LABEL_MAP)) {
      for (const label of labels) {
        this.exact.set(normalize(label), fieldKey);
      }
    }
  }

  resolve(cellText: string): string | null {
    const norm = normalize(cellText);
    if (!norm) return null;
    if (this.exact.has(norm)) return this.exact.get(norm)!;
    // 부분 일치 — 짧은 norm("번호", "명" 등)이 무관한 필드에 히트하지 않도록
    // 양쪽 모두 최소 4자 이상이고 짧은 쪽이 긴 쪽 길이의 50% 이상일 때만 허용
    if (norm.length < 4) return null;
    for (const [known, fieldKey] of this.exact.entries()) {
      if (!known || known.length < 4) continue;
      const shorter = norm.length <= known.length ? norm : known;
      const longer  = norm.length <= known.length ? known : norm;
      if (longer.includes(shorter) && shorter.length >= longer.length * 0.5) {
        return fieldKey;
      }
    }
    return null;
  }
}

// ── 사용자 답변 lookup 펼치기 ────────────────────────────────────────────────

function buildAnswerLookup(
  answers: Record<string, unknown>,
  resolver: LabelResolver,
): Record<string, string> {
  const lookup: Record<string, string> = {};
  for (const [k, vRaw] of Object.entries(answers)) {
    if (vRaw === null || vRaw === undefined) continue;
    const v = String(vRaw);
    if (!v) continue;
    lookup[`_raw_${normalize(k)}`] = v;
    const fieldKey = resolver.resolve(k);
    if (fieldKey && !(fieldKey in lookup)) lookup[fieldKey] = v;
    if (k in resolver.fields && !(k in lookup)) lookup[k] = v;
  }
  return lookup;
}

// ── 인접 셀 결정 ─────────────────────────────────────────────────────────────

function pickTarget(table: FormTable, labelCell: FormCell, resolver: LabelResolver): FormCell | null {
  const candidates: { base: number; cell: FormCell; empty: boolean }[] = [];
  const add = (cell: FormCell | null, base: number) => {
    if (!cell || cell === labelCell) return;
    const t = cell.text.trim();
    // 값칸이 아니라 '또 다른 라벨'(성명/주민번호 등 알려진 라벨)인 비어있지 않은 칸은 타깃 제외.
    // → "신청인" 우측의 "성 명" 같은 라벨칸에 값이 잘못 채워지는 문제 방지.
    if (t && resolver.resolve(t) !== null) return;
    // 작성 예시/플레이스홀더('-', 'ㅇㅇ', '시군 읍.면.동 …(행정리)', '(인)' 등)는 빈칸처럼 취급 → 덮어쓰기 대상
    candidates.push({ base, cell, empty: !t || isPlaceholderValue(t) });
  };
  const right = table.neighborRight(labelCell);
  add(right, 10);
  add(table.neighborBelow(labelCell), 5);
  if (right) add(table.neighborRight(right), 1);
  if (candidates.length === 0) return null;
  // 빈 칸을 강하게 우선(있으면 그 안에서 base 최고), 없으면 base 최고
  const empties = candidates.filter((c) => c.empty);
  const pool = empties.length ? empties : candidates;
  pool.sort((a, b) => b.base - a.base);
  return pool[0].cell;
}

// ── 행-그룹 헤더 탐지 (중복 라벨 분해용) ─────────────────────────────────────
//
// 한 표에 "성 명" 같은 라벨이 두 번 이상 나오면(신청인/배우자 등) LLM 이
// 어느 그룹인지 구분 못 해 엉뚱한 칸을 채운다. 라벨 셀의 행-그룹 헤더
// (왼쪽 또는 위쪽의 그룹명)를 찾아 "신청인 성명" 처럼 구분자를 붙인다.
//
// hwpilot 그리드는 병합을 1×1 로 평탄화한다(rowspan 그룹 라벨은 그룹 첫 행에만
// 존재하고, 덮인 행에는 그 열의 셀이 아예 없음 — 실측 확인). 그래서:
//   1) 같은 행에서 왼쪽(col < labelCol)으로 가장 가까운 비어있지 않은 셀.
//   2) 같은 행에 왼쪽 셀이 없으면(라벨이 그 행의 최좌측), 위 행들을 훑어
//      col ≤ labelCol 범위에서 가장 왼쪽의 비어있지 않은 셀(=rowspan 으로
//      이 행을 덮는 그룹 헤더)을 찾는다.
// rhwp 미리보기 그리드(진짜 col)와 hwpilot 어댑터 그리드(배열 인덱스 col)는
// col 좌표가 다르지만, 이 규칙은 각 그리드의 좌표만으로 같은 그룹명을 산출한다.
//
// skipNorms: 형제 라벨(다른 채울 라벨)의 normalize 집합. 그룹 헤더가 아니라
//   옆/위의 또 다른 라벨("주민번호" 옆의 "성명" 등)을 그룹으로 잘못 잡지 않도록
//   건너뛴다. 진짜 그룹 헤더(신청인/배우자)는 채울 라벨이 아니므로 skip 안 됨.
export function findRowGroup(table: FormTable, labelCell: FormCell, skipNorms?: Set<string>): string | null {
  const skip = (t: string) => !!skipNorms && skipNorms.has(normalize(t));
  const row = labelCell.row, col = labelCell.col;
  // 1) 같은 행 왼쪽 — 형제 라벨은 건너뛰고 그룹 헤더를 찾는다.
  for (let c = col - 1; c >= 0; c--) {
    const t = table.cellAt(row, c)?.text.trim();
    if (t && !skip(t)) return t;
  }
  // 2) 위 행들에서 col ≤ labelCol 의 최좌측 비형제 비어있지 않은 셀(rowspan 그룹 헤더).
  for (let r = row - 1; r >= 0; r--) {
    for (let c = 0; c <= col; c++) {
      const t = table.cellAt(r, c)?.text.trim();
      if (t && !skip(t)) return t;
    }
  }
  return null;
}

// ── 라벨→타깃셀 탐지 (구조 빌더와 fillForm 공유) ──────────────────────────────

export interface LabelTarget {
  labelCell: FormCell;
  targetCell: FormCell;
  label: string;
  fieldKey: string | null;
  /** 중복 라벨 구분용 행-그룹 헤더(예: "신청인"/"배우자"). 구분 불필요 시 undefined */
  group?: string;
}

export function findLabelTargets(doc: FormDoc): LabelTarget[] {
  const resolver = new LabelResolver();
  const out: LabelTarget[] = [];
  const usedTargets = new WeakSet<FormCell>();
  for (const table of doc.allTables()) {
    for (const cell of table.cells) {
      if (usedTargets.has(cell)) continue;
      const text = cell.text;
      if (!looksLikeLabel(text)) continue;
      const fieldKey = resolver.resolve(text);
      const target = pickTarget(table, cell, resolver);
      if (!target || usedTargets.has(target)) continue;
      usedTargets.add(target);
      out.push({ labelCell: cell, targetCell: target, label: text, fieldKey });
    }
  }
  // 같은 표 안에서 라벨 텍스트가 중복되는 경우에만 그룹 구분자를 붙인다.
  // (유일한 라벨엔 노이즈를 주지 않음 — 예: "임야소재지" 단독은 그대로.)
  const byTable = new Map<FormTable, LabelTarget[]>();
  for (const lt of out) {
    const tbl = tableOf(doc, lt.labelCell);
    if (!tbl) continue;
    (byTable.get(tbl) ?? byTable.set(tbl, []).get(tbl)!).push(lt);
  }
  for (const [table, items] of byTable) {
    const counts = new Map<string, number>();
    for (const it of items) counts.set(normalize(it.label), (counts.get(normalize(it.label)) ?? 0) + 1);
    // 건너뛸 형제 라벨 = 표 안에서 중복되는(=구분 대상) 필드 라벨들.
    // (신청인/배우자 같은 유일한 그룹 헤더는 건너뛰지 않아 그룹명으로 잡힌다.)
    const skipNorms = new Set<string>();
    for (const [n, cnt] of counts) if (cnt >= 2) skipNorms.add(n);
    for (const it of items) {
      if ((counts.get(normalize(it.label)) ?? 0) < 2) continue; // 중복 라벨만
      const group = findRowGroup(table, it.labelCell, skipNorms);
      if (group && normalize(group) !== normalize(it.label)) it.group = group;
    }
  }
  return out;
}

// labelCell 이 속한 표를 찾는다(셀 동일성 기반).
function tableOf(doc: FormDoc, cell: FormCell): FormTable | null {
  for (const table of doc.allTables()) {
    if (table.cells.includes(cell)) return table;
  }
  return null;
}

// ── 메인 ──────────────────────────────────────────────────────────────────────

export async function fillForm(
  doc: FormDoc,
  answers: Record<string, unknown>,
): Promise<FillReport> {
  const resolver = new LabelResolver();
  const lookup = buildAnswerLookup(answers, resolver);

  const filled: { label: string; field: string | null; value: string }[] = [];
  const unmatched: string[] = [];
  const unknown: string[] = [];
  const visitedTargets = new WeakSet<FormCell>();

  for (const table of doc.allTables()) {
    for (const cell of table.cells) {
      if (visitedTargets.has(cell)) continue;
      const text = cell.text;
      if (!looksLikeLabel(text)) continue;

      const fieldKey: string | null = resolver.resolve(text);
      let value: string | undefined;

      if (fieldKey !== null) {
        value = lookup[fieldKey];
        if (value === undefined) {
          value = lookup[`_raw_${normalize(text)}`];
        }
      } else {
        // 사전에 없는 라벨 — LLM이 만든 답변에 한글 라벨 그대로 들어왔으면 사용
        value = lookup[`_raw_${normalize(text)}`];
      }

      if (value === undefined || value === "") {
        if (fieldKey === null) unknown.push(text);
        else unmatched.push(`${text} → ${fieldKey}`);
        continue;
      }

      const target = pickTarget(table, cell, resolver);
      if (!target) {
        unknown.push(`${text} (인접 셀 없음)`);
        continue;
      }
      if (visitedTargets.has(target)) continue;

      target.setText(String(value));
      visitedTargets.add(target);
      filled.push({ label: text, field: fieldKey, value: String(value) });
    }
  }

  return {
    filled_count: filled.length,
    filled,
    unmatched_labels: unmatched,
    unknown_cells: unknown,
  };
}

// ── 양식 미리보기용 — 표 라벨 후보 추출 ──────────────────────────────────────

export interface PreviewSummary {
  filename: string;
  preview: string;
  table_count: number;
  tables: { index: number; rows: number; cols: number; label_candidates: string[] }[];
}

export function summarizeFormForPreview(filename: string, doc: FormDoc): PreviewSummary {
  const tables: PreviewSummary["tables"] = [];
  let i = 0;
  for (const t of doc.allTables()) {
    const labels: string[] = [];
    for (const c of t.cells) {
      const text = c.text;
      if (text && text.length <= 40) labels.push(text);
    }
    tables.push({ index: i, rows: t.nrows, cols: t.ncols, label_candidates: labels.slice(0, 30) });
    i++;
  }
  return {
    filename,
    preview: doc.toTextPreview(),
    table_count: tables.length,
    tables,
  };
}

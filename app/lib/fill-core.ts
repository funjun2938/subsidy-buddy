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

function normalize(s: string): string {
  return s.replace(/[\s:：·\-_,.()\[\]/]+/g, "").toLowerCase();
}

function looksLikeLabel(text: string): boolean {
  if (!text || text.length > 40) return false;
  if (/[.?!]$/.test(text)) return false;
  if (!/[가-힣A-Za-z]/.test(text)) return false;
  return true;
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

function pickTarget(table: FormTable, labelCell: FormCell): FormCell | null {
  const candidates: { score: number; cell: FormCell }[] = [];
  const right = table.neighborRight(labelCell);
  const below = table.neighborBelow(labelCell);
  if (right && right !== labelCell) {
    const emptyBonus = right.text ? 0 : 2;
    candidates.push({ score: 10 + emptyBonus, cell: right });
  }
  if (below && below !== labelCell) {
    const emptyBonus = below.text ? 0 : 2;
    candidates.push({ score: 5 + emptyBonus, cell: below });
  }
  if (right) {
    const rr = table.neighborRight(right);
    if (rr && rr !== labelCell) candidates.push({ score: 1, cell: rr });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].cell;
}

// ── 라벨→타깃셀 탐지 (구조 빌더와 fillForm 공유) ──────────────────────────────

export interface LabelTarget {
  labelCell: FormCell;
  targetCell: FormCell;
  label: string;
  fieldKey: string | null;
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
      const target = pickTarget(table, cell);
      if (!target || usedTargets.has(target)) continue;
      usedTargets.add(target);
      out.push({ labelCell: cell, targetCell: target, label: text, fieldKey });
    }
  }
  return out;
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

      const target = pickTarget(table, cell);
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

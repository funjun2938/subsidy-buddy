// HWPX 표 셀 자동기입 — 하위호환 shim.
//
// 포맷 무관 로직은 lib/fill-core.ts 로 이동했다 (HWPX/HWP 공용).
// 기존 호출부(app/api/fill-hwp-ai/route.ts 등)와의 호환을 위해
// HWPX 시그니처를 그대로 유지한 얇은 래퍼만 남긴다.

import { fillForm, summarizeFormForPreview } from "./fill-core";
import type { FillReport, PreviewSummary } from "./fill-core";
import type { HwpxDocument } from "./hwpx";

export type { FillReport, PreviewSummary } from "./fill-core";

export function fillDocument(
  doc: HwpxDocument,
  answers: Record<string, unknown>,
): Promise<FillReport> {
  return fillForm(doc, answers);
}

export function summarizeForPreview(filename: string, doc: HwpxDocument): PreviewSummary {
  return summarizeFormForPreview(filename, doc);
}

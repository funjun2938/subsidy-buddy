// 바이트를 받아 포맷을 판별하고 알맞은 FormDoc 어댑터를 연다.
//
//   - .hwpx → HwpxDocument (lib/hwpx.ts, 기존 검증된 경로 유지)
//   - .hwp  → HwpFormDoc  (lib/adapters/hwp-form-doc.ts, hwpilot 래핑)
//
// 포맷 판별은 hwpilot 의 detectFormat (매직바이트 기반) 을 재사용한다.
// 호출부(API 라우트)는 포맷을 몰라도 된다.

import type { FormDoc } from "./form-doc";
import { detectFormat } from "./hwpilot";
import { HwpxDocument } from "./hwpx";
import { HwpFormDoc } from "./adapters/hwp-form-doc";

export type DocFormat = "hwp" | "hwpx";

export async function openFormDoc(bytes: Uint8Array): Promise<FormDoc> {
  const format = detectFormat(bytes);
  if (format === "hwp") {
    return HwpFormDoc.fromBytes(bytes);
  }
  // hwpx (및 그 외) — 기존 HWPX 파서로 처리
  return HwpxDocument.fromBytes(bytes);
}

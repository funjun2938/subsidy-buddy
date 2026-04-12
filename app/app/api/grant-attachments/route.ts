import { NextRequest } from "next/server";
import { fetchGrantAttachmentsWithDebug } from "@/lib/grant-attachments";

// 공고 ID(pblancId)로 첨부파일 목록을 돌려준다.
//
// /generate 페이지가 페이지 진입 시 즉시 호출해서 "이 공고에 어떤 신청서 양식이 붙어있는지"를
// 사용자에게 보여준다. AI 자동 기입은 .hwpx만 가능하므로 ext === "hwpx"인 첨부를
// 우선 노출하고, 그 외에는 안내(한글 .hwp는 한컴오피스 변환 필요).

export const runtime = "nodejs";
// bizinfo.go.kr는 해외 IP에서 응답이 다르거나 차단될 수 있어 서울 region으로 강제
export const preferredRegion = "icn1";

export async function GET(request: NextRequest) {
  const pblancId = request.nextUrl.searchParams.get("pblancId");
  if (!pblancId || !pblancId.startsWith("PBLN_")) {
    return Response.json(
      { error: "pblancId 쿼리 파라미터가 필요합니다. (PBLN_ 접두 형식)" },
      { status: 400 }
    );
  }

  try {
    const { attachments, debug } = await fetchGrantAttachmentsWithDebug(pblancId);
    const hwpxFillable = attachments.filter((a) => a.ext === "hwpx");
    const hwpManualOnly = attachments.filter((a) => a.ext === "hwp");

    return Response.json({
      pblancId,
      attachments,
      summary: {
        total: attachments.length,
        ai_fillable: hwpxFillable.length,
        manual_only: hwpManualOnly.length,
      },
      // 디버그용 — 응답 원인 추적 (한국 IP 차단 / 빈 페이지 등 식별)
      debug,
    });
  } catch (e) {
    return Response.json(
      { error: "첨부 추출 실패", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}

import { NextRequest } from "next/server";
import { fetchGrantAttachments } from "@/lib/grant-attachments";

// 공고 ID(pblancId)로 첨부파일 목록을 돌려준다.
//
// /generate 페이지가 페이지 진입 시 즉시 호출해서 "이 공고에 어떤 신청서 양식이 붙어있는지"를
// 사용자에게 보여준다. AI 자동 기입은 .hwpx만 가능하므로 ext === "hwpx"인 첨부를
// 우선 노출하고, 그 외에는 안내(한글 .hwp는 한컴오피스 변환 필요).

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const pblancId = request.nextUrl.searchParams.get("pblancId");
  if (!pblancId || !pblancId.startsWith("PBLN_")) {
    return Response.json(
      { error: "pblancId 쿼리 파라미터가 필요합니다. (PBLN_ 접두 형식)" },
      { status: 400 }
    );
  }

  try {
    const attachments = await fetchGrantAttachments(pblancId);
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
    });
  } catch (e) {
    return Response.json(
      { error: "첨부 추출 실패", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}

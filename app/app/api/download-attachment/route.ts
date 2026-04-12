import { NextRequest } from "next/server";
import { downloadAttachment } from "@/lib/grant-attachments";

// bizinfo.go.kr 첨부 다운로드 전용 edge 라우트.
//
// vercel hobby plan에선 nodejs runtime function이 미국(iad)에 고정되는데
// bizinfo는 미국 IP 연결을 끊는다. edge runtime + ICN region pin을 쓰면
// 가장 가까운 아시아 edge(보통 sin1 또는 icn1)에서 실행되어 차단을 우회한다.
//
// 호출 방식:
//   GET /api/download-attachment?url=<encoded download url>&filename=<원본 파일명>
// 응답:
//   application/octet-stream + Content-Disposition (filename)
//   X-Origin-Url 헤더에 원본 URL 그대로 포함
//
// fill-hwp-ai 라우트가 LLM/HWPX 처리(nodejs)를 담당하므로, 클라이언트는
// 1) 이 edge 라우트로 ArrayBuffer를 받고
// 2) 그것을 multipart로 fill-hwp-ai에 다시 보낸다 (CORS 없음, 전부 동일 origin)

export const runtime = "edge";
export const preferredRegion = "icn1";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const url = sp.get("url");
  const filename = sp.get("filename") || "attachment";

  if (!url) {
    return Response.json({ error: "url 쿼리 파라미터가 필요합니다." }, { status: 400 });
  }
  // bizinfo.go.kr 도메인만 허용 — 임의 SSRF 방지
  if (!/^https?:\/\/(www\.)?bizinfo\.go\.kr\//i.test(url)) {
    return Response.json(
      { error: "허용되지 않은 도메인입니다.", url },
      { status: 400 }
    );
  }

  try {
    const buf = await downloadAttachment(url);
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "X-Origin-Url": url,
        "Cache-Control": "private, max-age=300", // 5분 캐시
      },
    });
  } catch (e) {
    return Response.json(
      {
        error: "첨부 다운로드 실패",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 502 }
    );
  }
}

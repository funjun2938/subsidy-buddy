import { NextRequest } from "next/server";
import { analyzeGrantAI } from "@/lib/ai";
import { getAllGrants, findGrantById } from "@/lib/grants-store";
import { UserCondition } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120; // 콜드 캐시 시 공공API 2소스(기업마당+K-Startup) 로딩 여유

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  const grants = await getAllGrants();

  if (!id) {
    // 키워드 검색(q): 지역·제목·기관·카테고리에서 매칭. limit 으로 개수 제한.
    const q = searchParams.get("q")?.trim();
    const limit = Math.min(Number(searchParams.get("limit")) || 0, 50);
    let list = grants;
    if (q) {
      const qq = q.toLowerCase();
      // 제목·지역 위주(직관적), 카테고리는 보조. orgName 은 오탐(서울 소재 기관 등) 많아 제외.
      list = grants.filter((g) =>
        g.title.toLowerCase().includes(qq) ||
        (g.region || "").toLowerCase().includes(qq) ||
        (g.category || "").toLowerCase().includes(qq),
      );
      // 제목에 키워드 포함된 공고를 앞으로 (정확도 우선)
      list = [...list].sort((a, b) => {
        const at = a.title.toLowerCase().includes(qq) ? 0 : 1;
        const bt = b.title.toLowerCase().includes(qq) ? 0 : 1;
        return at - bt;
      });
    }
    const sliced = limit > 0 ? list.slice(0, limit) : list;
    return Response.json({ grants: sliced, total: list.length });
  }

  const grant = findGrantById(grants, id);
  if (!grant) {
    return Response.json(
      { error: "지원사업을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const bizType = searchParams.get("bizType");
  const revenue = searchParams.get("revenue");
  const region = searchParams.get("region");
  const bizAge = searchParams.get("bizAge");
  const ceoAge = searchParams.get("ceoAge");

  let analysis = null;
  if (bizType && revenue && region && bizAge && ceoAge) {
    const condition: UserCondition = {
      bizType,
      revenue,
      region,
      bizAge,
      ceoAge,
    };
    analysis = await analyzeGrantAI(grant, condition);
  }

  return Response.json({ grant, analysis });
}

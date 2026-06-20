import { NextRequest } from "next/server";
import { unstable_cache } from "next/cache";
import { matchGrantsAI } from "@/lib/ai";
import { getAllGrants } from "@/lib/grants-store";
import { UserCondition } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120; // 콜드 캐시 시 공공API 2소스 로딩+LLM 재랭킹 여유

// 재현성: 동일 사업자(동일 조건)는 매번 같은 매칭 결과가 나와야 한다.
// 조건을 정규화한 키로 결과를 캐싱(grant 풀 revalidate 와 동일한 1h TTL) →
// LLM 재랭킹을 매번 다시 돌리지 않고 캐시된 결과를 반환.
function conditionKey(c: UserCondition): string {
  return JSON.stringify({
    bizType: c.bizType?.trim() || "",
    revenue: c.revenue?.trim() || "",
    region: c.region?.trim() || "",
    bizAge: c.bizAge?.trim() || "",
    ceoAge: c.ceoAge?.trim() || "",
    summary: (c.summary || "").trim(),
    keywords: (c.keywords || []).map((k) => k.trim()).filter(Boolean).sort(),
  });
}

async function computeMatches(condition: UserCondition) {
  const grants = await getAllGrants();
  const matches = await matchGrantsAI(condition, grants);
  return {
    matches,
    totalGrants: grants.length,
    source: grants.some((g) => g.id.startsWith("biz-")) ? "live+seed" : "seed",
  };
}

export async function POST(request: NextRequest) {
  let body: UserCondition;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  try {
    if (
      !body.bizType ||
      !body.revenue ||
      !body.region ||
      !body.bizAge ||
      !body.ceoAge
    ) {
      // summary와 keywords는 optional이므로 체크하지 않음
      return Response.json(
        { error: "모든 조건을 입력해주세요." },
        { status: 400 }
      );
    }

    // 동일 조건이면 캐시된 결과 반환(재현성). 조건 해시를 캐시 키에 포함.
    const key = conditionKey(body);
    const getCached = unstable_cache(
      () => computeMatches(body),
      ["match-result", key],
      { revalidate: 3600 },
    );
    const result = await getCached();
    return Response.json(result);
  } catch (error) {
    console.error("Match API error:", error);
    return Response.json(
      { error: "매칭 분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

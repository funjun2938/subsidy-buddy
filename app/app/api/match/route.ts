import { NextRequest } from "next/server";
import { matchGrantsAI } from "@/lib/ai";
import { getAllGrants } from "@/lib/grants-store";
import { UserCondition } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: UserCondition = await request.json();

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

    // 실제 API + 시드 데이터 통합 조회
    const grants = await getAllGrants();
    const matches = await matchGrantsAI(body, grants);

    return Response.json({
      matches,
      totalGrants: grants.length,
      source: grants.some((g) => g.id.startsWith("biz-")) ? "live+seed" : "seed",
    });
  } catch (error) {
    console.error("Match API error:", error);
    return Response.json(
      { error: "매칭 분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

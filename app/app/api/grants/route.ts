import { NextRequest } from "next/server";
import { analyzeGrantAI } from "@/lib/ai";
import { getAllGrants, findGrantById } from "@/lib/grants-store";
import { UserCondition } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  const grants = await getAllGrants();

  if (!id) {
    return Response.json({ grants, total: grants.length });
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

import { unstable_cache } from "next/cache";
import { Grant } from "./types";
import { grants as seedGrants } from "./seed-data";
import { fetchBizInfoGrants, fetchKstartupGrants } from "./crawler";

// 기업마당 + K-Startup 라이브 공고 + 시드 병합 → 만료 필터 → 마감 임박순 정렬.
// Next 데이터 캐시(unstable_cache)로 교차 인스턴스 캐싱 + SWR(1시간) →
// 요청마다 전체를 다시 fetch하지 않아 지연 없이 즉시 응답.
const loadAllGrants = unstable_cache(
  async (): Promise<Grant[]> => {
    // 두 소스를 병렬 fetch — 한쪽이 실패해도 나머지+시드는 유지
    const [bizRes, ksRes] = await Promise.allSettled([
      fetchBizInfoGrants(),
      fetchKstartupGrants(),
    ]);
    const bizGrants = bizRes.status === "fulfilled" ? bizRes.value : [];
    const ksGrants = ksRes.status === "fulfilled" ? ksRes.value : [];

    let merged: Grant[];
    if (bizGrants.length > 0 || ksGrants.length > 0) {
      // 제목 중복 제거: 기업마당 > K-Startup > 시드 우선순위
      const seen = new Set<string>();
      merged = [];
      for (const g of [...bizGrants, ...ksGrants, ...seedGrants]) {
        if (seen.has(g.title)) continue;
        seen.add(g.title);
        merged.push(g);
      }
    } else {
      merged = seedGrants; // 양쪽 API 모두 실패 시 시드 폴백
    }

    const now = Date.now();
    return merged
      .filter((g) => g.deadline === "상시" || new Date(g.deadline).getTime() >= now)
      .sort((a, b) => {
        if (a.deadline === "상시") return 1;
        if (b.deadline === "상시") return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
  },
  ["all-grants-v1"],
  { revalidate: 3600, tags: ["grants"] }
);

export async function getAllGrants(): Promise<Grant[]> {
  return loadAllGrants();
}

export function findGrantById(grants: Grant[], id: string): Grant | undefined {
  return grants.find((g) => g.id === id);
}

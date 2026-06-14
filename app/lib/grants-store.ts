import { unstable_cache } from "next/cache";
import { Grant } from "./types";
import { grants as seedGrants } from "./seed-data";
import { fetchBizInfoGrants } from "./crawler";

// 기업마당 전체 공고 + 시드 병합 → 만료 필터 → 마감 임박순 정렬.
// Next 데이터 캐시(unstable_cache)로 교차 인스턴스 캐싱 + SWR(1시간) →
// 요청마다 전체를 다시 fetch하지 않아 지연 없이 즉시 응답.
const loadAllGrants = unstable_cache(
  async (): Promise<Grant[]> => {
    const liveGrants = await fetchBizInfoGrants();

    let merged: Grant[];
    if (liveGrants.length > 0) {
      // 라이브(기업마당) 우선 + 중복 아닌 시드 보강
      const liveTitles = new Set(liveGrants.map((g) => g.title));
      merged = [...liveGrants, ...seedGrants.filter((g) => !liveTitles.has(g.title))];
    } else {
      merged = seedGrants; // API 실패 시 시드 폴백
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

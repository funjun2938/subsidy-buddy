import { Grant } from "./types";
import { grants as seedGrants } from "./seed-data";
import { fetchBizInfoGrants } from "./crawler";

let cachedGrants: Grant[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1시간

export async function getAllGrants(): Promise<Grant[]> {
  const now = Date.now();
  if (cachedGrants && now - cacheTimestamp < CACHE_TTL) {
    return cachedGrants;
  }

  // 기업마당 API에서 실제 데이터 가져오기
  const liveGrants = await fetchBizInfoGrants();

  if (liveGrants.length > 0) {
    // 실제 API 데이터 + 시드 데이터 합치기 (중복 제거)
    const liveIds = new Set(liveGrants.map((g) => g.title));
    const uniqueSeeds = seedGrants.filter((g) => !liveIds.has(g.title));
    cachedGrants = [...liveGrants, ...uniqueSeeds];
  } else {
    // API 실패 시 시드 데이터만 사용
    cachedGrants = seedGrants;
  }

  // 마감일 지난 것 필터 + 마감 임박순 정렬
  cachedGrants = cachedGrants
    .filter((g) => {
      if (g.deadline === "상시") return true;
      return new Date(g.deadline) >= new Date();
    })
    .sort((a, b) => {
      if (a.deadline === "상시") return 1;
      if (b.deadline === "상시") return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  cacheTimestamp = now;
  return cachedGrants;
}

export function findGrantById(grants: Grant[], id: string): Grant | undefined {
  return grants.find((g) => g.id === id);
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // 링크 프리페치/RSC 요청에서는 세션 갱신(getUser 네트워크 호출 + 쿠키 세팅)을 건너뛴다.
  // 모든 prefetch 마다 Supabase 왕복 + Set-Cookie 가 붙으면:
  //  - 응답이 no-store 가 되어 매번 원본 함수 호출(체감 지연), 그리고
  //  - Safari 가 prefetch 응답의 Set-Cookie 를 막아 "access control checks" 로 RSC fetch 가 깨진다.
  // 실제 네비게이션/문서 로드 시 세션이 갱신되므로 prefetch 는 그냥 통과시킨다.
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    !!request.headers.get("sec-purpose")?.includes("prefetch");
  if (isPrefetch) return response;

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Supabase 가 느리거나 실패해도 요청 자체가 깨지지 않게 방어.
  try {
    await supabase.auth.getUser();
  } catch {
    /* 세션 갱신 실패는 무시 — 페이지 렌더는 계속 진행 */
  }

  return response;
}

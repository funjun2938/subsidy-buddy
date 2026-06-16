function required(name: string, value: string | undefined): string {
  // 값 끝에 개행/공백이 섞이면(env 등록 실수로 흔함) URL·JWT 가 깨져
  // Supabase 호출이 전부 실패한다(회원가입/로그인 불가). 방어적으로 trim.
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return trimmed;
}

export const env = {
  SUPABASE_URL: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ),
  SUPABASE_ANON_KEY: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
};

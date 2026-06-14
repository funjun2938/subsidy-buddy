-- ============================================================================
-- AI 문서생성 무료 토큰(예산) + PRO 구독 — 서버측 영속/강제용
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 한 번 실행하세요.
-- (앱은 SUPABASE_SERVICE_ROLE_KEY 로 이 테이블에 접근. RLS 는 service_role 우회)
-- ============================================================================

-- 1) 신원(로그인 user 또는 익명 쿠키)별 '오늘' 사용한 토큰 누적
create table if not exists public.doc_usage (
  identity     text        not null,           -- 'user:<uuid>' 또는 'anon:<cookie-id>'
  usage_date   date        not null,           -- KST 기준 날짜
  tokens_used  bigint      not null default 0, -- 추정 토큰 누적
  updated_at   timestamptz not null default now(),
  primary key (identity, usage_date)
);

-- 2) 사용자 PRO 구독 상태
create table if not exists public.subscriptions (
  user_id            uuid        primary key references auth.users(id) on delete cascade,
  plan               text        not null default 'free',   -- free | premium | business
  status             text        not null default 'active', -- active | cancelled
  current_period_end timestamptz,
  updated_at         timestamptz not null default now()
);

-- RLS 활성화(서비스 롤은 우회). 본인 구독만 읽기 허용.
alter table public.doc_usage     enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- 3) 토큰 원자적 증가 (동시성 안전). 새 누적값 반환.
create or replace function public.add_doc_tokens(p_identity text, p_date date, p_tokens bigint)
returns bigint
language plpgsql
security definer
as $$
declare new_total bigint;
begin
  insert into public.doc_usage (identity, usage_date, tokens_used, updated_at)
  values (p_identity, p_date, greatest(p_tokens, 0), now())
  on conflict (identity, usage_date)
  do update set tokens_used = public.doc_usage.tokens_used + greatest(p_tokens, 0),
                updated_at  = now()
  returning tokens_used into new_total;
  return new_total;
end;
$$;

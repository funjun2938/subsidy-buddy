-- ============================================================================
-- 저장한 매칭 결과 (회원가입 시 'pendingMatch' 이관 + 결과 페이지 저장)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 한 번 실행하세요.
-- AuthForm.savePendingMatch / SaveMatchSection 이 이 테이블에 insert 합니다.
-- ============================================================================

create table if not exists public.saved_matches (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  conditions     jsonb       not null,           -- 사용자 입력 조건
  matched_grants jsonb       not null,           -- 매칭된 공고 결과 스냅샷
  created_at     timestamptz not null default now()
);

create index if not exists saved_matches_user_idx
  on public.saved_matches (user_id, created_at desc);

-- 본인 행만 읽기/쓰기 (anon 키로 접근하므로 RLS 필수)
alter table public.saved_matches enable row level security;

drop policy if exists "insert own match" on public.saved_matches;
create policy "insert own match" on public.saved_matches
  for insert with check (auth.uid() = user_id);

drop policy if exists "read own match" on public.saved_matches;
create policy "read own match" on public.saved_matches
  for select using (auth.uid() = user_id);

drop policy if exists "delete own match" on public.saved_matches;
create policy "delete own match" on public.saved_matches
  for delete using (auth.uid() = user_id);

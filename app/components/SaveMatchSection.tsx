"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MatchResult } from "@/lib/types";

interface SaveMatchSectionProps {
  conditions: Record<string, unknown>;
  matchedGrants: MatchResult[];
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function SaveMatchSection({
  conditions,
  matchedGrants,
}: SaveMatchSectionProps) {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setCheckingAuth(false);
    });
  }, [supabase]);

  async function handleSave() {
    if (!userId) return;
    setSaveState("saving");
    const { error } = await supabase.from("saved_matches").insert({
      user_id: userId,
      conditions,
      matched_grants: matchedGrants,
    });
    setSaveState(error ? "error" : "saved");
  }

  function handleSignupAndSave() {
    sessionStorage.setItem(
      "pendingMatch",
      JSON.stringify({ conditions, matchedGrants })
    );
    router.push("/signup");
  }

  if (checkingAuth) return null;

  if (!userId) {
    return (
      <div className="glass rounded-2xl p-5 mb-6 border border-cyan-500/20">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)] mb-0.5">
              💡 결과를 저장하고 다시 보고 싶으신가요?
            </p>
            <p className="text-xs text-[var(--muted)]">
              회원가입하면 사업자등록증 다시 안 올려도 돼요
            </p>
          </div>
          <button
            onClick={handleSignupAndSave}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 transition shadow-md shadow-cyan-500/20"
          >
            회원가입하고 저장
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)] mb-0.5">
            💾 이 결과를 내 계정에 저장
          </p>
          <p className="text-xs text-[var(--muted)]">
            나중에 다시 와서 확인할 수 있어요
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveState === "saving" || saveState === "saved"}
          className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-violet-500 text-white hover:from-cyan-400 hover:to-violet-400 shadow-md shadow-cyan-500/20 disabled:opacity-60"
        >
          {saveState === "idle" && "내 결과 저장하기"}
          {saveState === "saving" && "저장 중..."}
          {saveState === "saved" && "✓ 저장됨"}
          {saveState === "error" && "다시 시도"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signup" | "login";

interface AuthFormProps {
  mode: Mode;
}

const COPY = {
  signup: {
    title: "회원가입",
    subtitle: "이메일만 남기면 사업자등록증 다시 안 올려도 돼요",
    submit: "가입하고 결과 저장하기",
    submitting: "가입 중...",
    switchText: "이미 계정이 있으신가요?",
    switchLink: "로그인",
    switchHref: "/login",
    passwordAutocomplete: "new-password",
  },
  login: {
    title: "로그인",
    subtitle: "저장한 매칭 결과를 다시 불러옵니다",
    submit: "로그인",
    submitting: "로그인 중...",
    switchText: "처음이신가요?",
    switchLink: "회원가입 →",
    switchHref: "/signup",
    passwordAutocomplete: "current-password",
  },
} as const;

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const copy = COPY[mode];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function savePendingMatch(userId: string) {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("pendingMatch");
    if (!raw) return;
    try {
      const pending = JSON.parse(raw);
      await supabase.from("saved_matches").insert({
        user_id: userId,
        conditions: pending.conditions,
        matched_grants: pending.matchedGrants,
      });
      sessionStorage.removeItem("pendingMatch");
    } catch {
      // 저장 실패해도 가입 자체는 성공이므로 진행
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 해요.");
      setSubmitting(false);
      return;
    }

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError || !data.user) {
        setError("입력 정보를 확인해 주세요.");
        setSubmitting(false);
        return;
      }

      await savePendingMatch(data.user.id);
      router.push("/");
      router.refresh();
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("입력 정보를 확인해 주세요.");
        setSubmitting(false);
        return;
      }

      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-12">
      <h1 className="text-3xl font-black mb-2">
        <span className="gradient-text">{copy.title}</span>
      </h1>
      <p className="text-gray-400 text-sm mb-8">{copy.subtitle}</p>

      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs text-gray-500 font-medium mb-2"
          >
            이메일
          </label>
          <input
            ref={emailRef}
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-cyan-400/50 transition"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs text-gray-500 font-medium mb-2"
          >
            비밀번호 <span className="text-gray-600">(8자 이상)</span>
          </label>
          <input
            id="password"
            type="password"
            autoComplete={copy.passwordAutocomplete}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-cyan-400/50 transition"
          />
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-violet-500 text-white hover:from-cyan-400 hover:to-violet-400 transition shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? copy.submitting : copy.submit}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        {copy.switchText}{" "}
        <Link
          href={copy.switchHref}
          className="text-cyan-400 hover:text-cyan-300 transition font-medium"
        >
          {copy.switchLink}
        </Link>
      </p>
    </div>
  );
}

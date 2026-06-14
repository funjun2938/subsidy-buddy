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

function mapAuthError(message: string | undefined, mode: Mode): string {
  if (!message) return "오류가 발생했습니다. 다시 시도해 주세요.";
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already")) {
    return "이미 가입된 이메일입니다.";
  }
  if (m.includes("invalid login credentials") || m.includes("invalid email or password")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (m.includes("invalid email")) {
    return "올바른 이메일 형식이 아닙니다.";
  }
  if (m.includes("password")) {
    return mode === "signup"
      ? "비밀번호 형식이 올바르지 않습니다. (8자 이상)"
      : "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  }
  return "오류가 발생했습니다. 다시 시도해 주세요.";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const copy = COPY[mode];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
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
    setInfo(null);
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
        setError(mapAuthError(signUpError?.message, mode));
        setSubmitting(false);
        return;
      }

      // 이메일 인증이 켜져 있으면 session이 null. 즉시 로그인된 상태가 아님.
      if (!data.session) {
        setInfo(
          "가입 완료! 이메일로 보낸 인증 링크를 확인해 주세요. 인증 후 로그인할 수 있어요."
        );
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
        setError(mapAuthError(signInError.message, mode));
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
      <p className="text-[var(--muted)] text-sm mb-8">{copy.subtitle}</p>

      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs text-[var(--muted)] font-medium mb-2"
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
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-cyan-400/50 transition"
            style={{
              background: "var(--input-bg)",
              borderWidth: "1px",
              borderColor: "var(--input-border)",
              color: "var(--foreground)",
            }}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs text-[var(--muted)] font-medium mb-2"
          >
            비밀번호 <span className="opacity-70">(8자 이상)</span>
          </label>
          <input
            id="password"
            type="password"
            autoComplete={copy.passwordAutocomplete}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-cyan-400/50 transition"
            style={{
              background: "var(--input-bg)",
              borderWidth: "1px",
              borderColor: "var(--input-border)",
              color: "var(--foreground)",
            }}
          />
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-500 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {info && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-700 dark:text-cyan-300"
          >
            {info}
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

      <p className="text-center text-sm text-[var(--muted)] mt-6">
        {copy.switchText}{" "}
        <Link
          href={copy.switchHref}
          className="text-cyan-500 dark:text-cyan-400 hover:opacity-80 transition font-medium"
        >
          {copy.switchLink}
        </Link>
      </p>
    </div>
  );
}

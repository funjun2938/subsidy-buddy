import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관 | 보조금매칭AI",
  description: "보조금매칭AI 서비스 이용약관",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-black mb-2">
          <span className="gradient-text">이용약관</span>
        </h1>
        <p className="text-xs text-gray-500">
          최종 수정: 2026년 4월 29일 · v0.1 (초안)
        </p>
      </div>

      <div className="space-y-8 text-sm text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-white mb-3">제1조 (목적)</h2>
          <p>
            본 약관은 보조금매칭AI(이하 &quot;서비스&quot;)가 제공하는 정부
            지원사업 매칭 및 신청서 생성 서비스의 이용 조건과 절차, 이용자와
            서비스 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-3">
            제2조 (서비스의 성격)
          </h2>
          <p className="mb-3">
            본 서비스는 정부기관과 직접적으로 제휴된 서비스가 아닙니다. 서비스가
            제공하는 모든 매칭 결과 및 AI 생성 신청서 초안은{" "}
            <strong className="text-white">참고 자료</strong>이며, 자격 여부 및
            합격 보장을 의미하지 않습니다.
          </p>
          <p>
            이용자는 실제 자격 요건과 신청 절차를 해당 공고 원문 또는 소관
            부처를 통해 직접 확인할 책임이 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-3">
            제3조 (서비스의 제공 및 변경)
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>서비스는 무료 및 유료 기능을 함께 제공합니다.</li>
            <li>
              서비스는 안정적 운영을 위해 필요 시 점검·개선·중단할 수 있으며,
              사전 공지를 원칙으로 합니다.
            </li>
            <li>
              공공 데이터(기업마당 공공API 등)의 제공 중단 시 일부 기능이 영향을
              받을 수 있습니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-3">
            제4조 (책임의 제한)
          </h2>
          <p>
            서비스는 AI 분석 결과의 정확성을 최선을 다해 검증하지만, 매칭 누락,
            오매칭, 또는 신청서 초안 내용의 부정확성으로 인해 발생한 직·간접
            손해에 대해 법령상 허용 가능한 한도 내에서 책임을 지지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-3">
            제5조 (개인정보 보호)
          </h2>
          <p>
            업로드된 사업자등록증 등 개인 문서는 AI 분석 목적으로만 사용되며,
            서버에 영구 저장되지 않습니다. 자세한 사항은{" "}
            <Link
              href="/privacy"
              className="text-cyan-400 hover:text-cyan-300 transition"
            >
              개인정보처리방침
            </Link>
            을 참고하세요.
          </p>
        </section>

        <section className="pt-4 border-t border-white/5">
          <p className="text-xs text-gray-500">
            본 약관은 초기 단계의 초안이며, 정식 출시 전 법무 검토를 거쳐 최종
            확정될 예정입니다. 문의:{" "}
            <a
              href="mailto:support@subsidy-ai.kr"
              className="text-cyan-400 hover:text-cyan-300 transition"
            >
              support@subsidy-ai.kr
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

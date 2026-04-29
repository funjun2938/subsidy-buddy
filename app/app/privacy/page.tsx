import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 보조금매칭AI",
  description: "보조금매칭AI 개인정보 수집 및 처리 방침",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-black mb-2">
          <span className="gradient-text">개인정보처리방침</span>
        </h1>
        <p className="text-xs text-gray-500">
          최종 수정: 2026년 4월 29일 · v0.1 (초안)
        </p>
      </div>

      <div className="space-y-8 text-sm text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-white mb-3">
            1. 수집하는 개인정보 항목
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong className="text-white">사업자등록증 이미지</strong> — AI
              분석을 통한 사업 정보 추출 (업종, 매출, 지역, 업력 등)
            </li>
            <li>
              <strong className="text-white">사업 조건 입력값</strong> — 매칭
              스코어링을 위한 자발적 입력 정보
            </li>
            <li>
              <strong className="text-white">결제 정보</strong> — 결제 처리 시
              TossPayments를 통해 처리되며, 본 서비스는 카드 정보를 직접 저장하지
              않습니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-3">
            2. 처리 목적 및 방식
          </h2>
          <p className="mb-3">
            업로드된 문서는 AI(Gemini Vision / Claude) 분석 목적으로만 사용되며,
            분석 완료 즉시 메모리에서 삭제됩니다. 서버에 영구 저장하지 않습니다.
          </p>
          <p>
            매칭 결과 및 신청서 생성 결과는 사용자 세션 종료 시 함께 폐기됩니다
            (북마크/저장 기능 사용 시 별도 명시).
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-3">
            3. 외부 서비스 제공 데이터
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong className="text-white">Google Gemini API</strong> —
              사업자등록증 이미지 분석
            </li>
            <li>
              <strong className="text-white">Anthropic Claude API</strong> —
              폴백 AI 분석 및 신청서 생성
            </li>
            <li>
              <strong className="text-white">TossPayments</strong> — 결제 처리
            </li>
            <li>
              <strong className="text-white">기업마당 공공API</strong> — 지원사업
              메타데이터 조회 (사용자 식별 정보 미전송)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-3">
            4. 보유 및 이용 기간
          </h2>
          <p>
            업로드된 문서: 분석 완료 후 즉시 삭제 (메모리 해제). 결제 정보:
            전자상거래법에 따라 5년 보관 (TossPayments 측). 사용자 입력 조건:
            세션 종료 시 폐기.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-3">
            5. 이용자의 권리
          </h2>
          <p>
            이용자는 언제든지 자신의 개인정보 처리 현황을 열람·삭제·이의 제기할
            수 있으며, 아래 연락처로 요청할 수 있습니다.
          </p>
        </section>

        <section className="pt-4 border-t border-white/5">
          <p className="text-xs text-gray-500">
            본 방침은 초기 단계의 초안이며, 정식 출시 전 개인정보보호법 및
            관련 법령을 기준으로 최종 검토·확정될 예정입니다. 문의:{" "}
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

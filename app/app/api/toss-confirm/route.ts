// Next.js 프로젝트용 토스페이먼츠 결제 승인 라우트
// 배치 경로: app/api/toss-confirm/route.ts
// 환경 변수: TOSS_SECRET_KEY (Vercel env)
// 테스트 키: test_sk_DpexMgkW36AbgknqWnP7ZGbR5ozO

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: 'payment_not_configured', message: 'TOSS_SECRET_KEY env required' }, { status: 500 });
  }

  const body = await req.json();
  const { paymentKey, orderId, amount } = body;

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const auth = Buffer.from(`${secret}:`).toString('base64');
  const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data.code, message: data.message }, { status: res.status });
  }

  // TODO: DB에 orderId, userId, amount, product 저장 + 구독 활성화
  return NextResponse.json({ ok: true, payment: data });
}

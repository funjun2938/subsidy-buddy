import { getPlan } from "@/lib/payment-plans";

export async function POST(request: Request) {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    console.error("[payments/confirm] TOSS_SECRET_KEY 미설정");
    return Response.json({ ok: false, error: "결제 설정 오류" }, { status: 500 });
  }

  let body: { paymentKey?: string; orderId?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const { paymentKey, orderId, amount } = body;
  if (!paymentKey || !orderId || typeof amount !== "number") {
    return Response.json(
      { ok: false, error: "필수 파라미터가 누락되었습니다." },
      { status: 400 },
    );
  }

  // orderId(order_{planId}_...)에서 플랜을 파싱해 금액을 서버에서 검증한다.
  const planId = orderId.split("_")[1];
  const plan = getPlan(planId);
  if (!plan || !Number.isFinite(amount) || amount <= 0 || amount !== plan.price) {
    return Response.json(
      { ok: false, error: "결제 금액이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const auth = Buffer.from(`${secretKey}:`).toString("base64");

  const tossRes = await fetch(
    "https://api.tosspayments.com/v1/payments/confirm",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    },
  );

  const data = await tossRes.json();

  if (!tossRes.ok) {
    return Response.json(
      {
        ok: false,
        error: data?.message ?? "결제 승인에 실패했습니다.",
        code: data?.code,
      },
      { status: tossRes.status },
    );
  }

  return Response.json({
    ok: true,
    orderName: data.orderName,
    method: data.method,
    approvedAt: data.approvedAt,
    totalAmount: data.totalAmount,
  });
}

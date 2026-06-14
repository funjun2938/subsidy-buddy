// 공통 수익화 블록 — Next.js 프로젝트 root layout.tsx에 주입
// 사용: <MonetizationBlock /> 를 <body> 안쪽에 배치
import Script from 'next/script';

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-PLACEHOLDER_REPLACE_ME';

export function MonetizationBlock({ enablePro = false }: { enablePro?: boolean }) {
  return (
    <>
      <Script
        async
        src={`https://pagead2.googleusercontent.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      {enablePro && (
        <div style={{position:'fixed',top:0,left:0,right:0,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',padding:'10px 16px',textAlign:'center',fontSize:14,zIndex:9999}}>
          ✨ 더 많은 기능이 필요하신가요?{' '}
          <a href="/pricing" style={{color:'#fff',fontWeight:700,textDecoration:'underline',marginLeft:8}}>PRO 플랜 보기 →</a>
        </div>
      )}
    </>
  );
}

import Link from 'next/link';
import Image from 'next/image';
import { getPlatformClaimUrl } from '@/lib/domain-routing';

export default function SuccessPage({
  searchParams,
}: {
  searchParams?: { salon?: string | string[] };
}) {
  const claimSlug =
    typeof searchParams?.salon === 'string'
      ? searchParams.salon
      : Array.isArray(searchParams?.salon)
        ? searchParams?.salon[0]
        : '';
  const claimUrl = claimSlug ? getPlatformClaimUrl(claimSlug) : '';

  return (
    <div style={{ minHeight:'100vh', background:'#FAFAF8', fontFamily:"'Inter',system-ui,sans-serif", display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>

      <style>{`
        @keyframes popIn    { 0%{transform:scale(0);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes drawCheck{ 0%{opacity:0;stroke-dasharray:30;stroke-dashoffset:30} 100%{opacity:1;stroke-dasharray:30;stroke-dashoffset:0} }
        @keyframes fadeUp   { 0%{opacity:0;transform:translateY(20px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes float1   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,15px)} }
        @keyframes float2   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(18px,-22px)} }
        .orb { position:absolute; border-radius:50%; filter:blur(80px); pointer-events:none; }
        .check-circle { animation:popIn .5s cubic-bezier(.34,1.56,.64,1) forwards; }
        .check-svg    { animation:drawCheck .4s ease .3s forwards; opacity:0; }
        .fade-1 { animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .1s forwards; opacity:0; }
        .fade-2 { animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .22s forwards; opacity:0; }
        .fade-3 { animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .34s forwards; opacity:0; }
        .fade-4 { animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .46s forwards; opacity:0; }
        .btn-primary {
          display:inline-block; padding:14px 32px;
          background:linear-gradient(135deg,#7C3AED,#6D28D9);
          color:#fff; border-radius:100px;
          font-size:15px; font-weight:700; text-decoration:none; letter-spacing:-.01em;
          box-shadow:0 8px 28px rgba(124,58,237,.38);
          transition:transform .2s,box-shadow .2s;
        }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 14px 40px rgba(124,58,237,.5); }
        .btn-ghost {
          display:inline-block; padding:14px 32px;
          background:#fff; color:#0D0D12;
          border:1.5px solid rgba(0,0,0,.1); border-radius:100px;
          font-size:15px; font-weight:600; text-decoration:none; letter-spacing:-.01em;
          transition:border-color .2s,box-shadow .2s;
        }
        .btn-ghost:hover { border-color:rgba(124,58,237,.3); box-shadow:0 4px 14px rgba(0,0,0,.07); }
      `}</style>

      {/* Background orbs */}
      <div className="orb" style={{ width:600, height:600, background:'rgba(124,58,237,.1)', top:'-200px', left:'-150px', animation:'float1 12s ease-in-out infinite' }} />
      <div className="orb" style={{ width:400, height:400, background:'rgba(212,168,83,.07)', bottom:'-100px', right:'-100px', animation:'float2 10s ease-in-out infinite' }} />

      {/* Nav */}
      <nav style={{ position:'relative', zIndex:10, height:60, display:'flex', alignItems:'center', padding:'0 24px', borderBottom:'1px solid rgba(0,0,0,.06)', background:'rgba(250,250,248,.9)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)' }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' }}>
          <div style={{ width:30, height:30, borderRadius:7, background:'linear-gradient(135deg,#7C3AED,#6D28D9)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#fff', boxShadow:'0 3px 10px rgba(124,58,237,.4)' }}>c</div>
          <span style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.04em', color:'#0D0D12' }}>clicka.bg</span>
        </Link>
      </nav>

      {/* Content */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 24px', textAlign:'center', position:'relative', zIndex:1 }}>

        {/* Check icon */}
        <div className="check-circle" style={{ width:88, height:88, borderRadius:'50%', background:'linear-gradient(135deg,#7C3AED,#6D28D9)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:32, boxShadow:'0 16px 48px rgba(124,58,237,.38)' }}>
          <svg className="check-svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="fade-1" style={{ fontSize:'clamp(28px,5vw,46px)', fontWeight:800, margin:'0 0 16px', letterSpacing:'-0.03em', lineHeight:1.1, color:'#0D0D12' }}>
          Сайтът ти се подготвя!
        </h1>

        <p className="fade-2" style={{ fontSize:18, color:'#667085', maxWidth:480, lineHeight:1.65, margin:'0 0 40px' }}>
          {claimSlug
            ? 'Плащането мина успешно. Можеш веднага да claim-неш сайта и да влезеш в dashboard-а.'
            : 'Ще получиш имейл до 15 минути с линк към твоя нов сайт.'}
        </p>

        {/* Feature checklist */}
        <div className="fade-3" style={{ background:'rgba(124,58,237,.05)', border:'1px solid rgba(124,58,237,.12)', borderRadius:20, padding:'24px 32px', marginBottom:40, maxWidth:420, width:'100%' }}>
          {[
            '✓  Резервационната система е активна',
            '✓  Имейл напомняния са включени',
            '✓  Сайтът ти е достъпен 24/7',
          ].map(line => (
            <p key={line} style={{ fontSize:15, margin:'8px 0', color:'#4B5563', textAlign:'left', fontWeight:500 }}>{line}</p>
          ))}
        </div>

        <div className="fade-4" style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
          {claimSlug && (
            <a href={claimUrl} className="btn-primary">Claim-ни сайта</a>
          )}
          <Link href="/" className={claimSlug ? 'btn-ghost' : 'btn-primary'}>Към началната страница</Link>
        </div>
      </div>
    </div>
  );
}

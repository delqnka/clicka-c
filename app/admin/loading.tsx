import { tokens } from '@/lib/admin-theme';

const HEADER_HEIGHT_DESKTOP = tokens.layout.headerHeightDesktop;
const HEADER_HEIGHT_MOBILE = tokens.layout.headerHeightMobile;

const shimmer: React.CSSProperties = {
  background:
    'linear-gradient(90deg, #f4f4f5 0%, #e4e4e7 50%, #f4f4f5 100%)',
  backgroundSize: '200% 100%',
  animation: 'clicka-admin-shimmer 1.4s ease-in-out infinite',
  borderRadius: 10,
};

function Bar({
  w,
  h = 14,
  radius = 8,
}: {
  w: string | number;
  h?: number;
  radius?: number;
}) {
  return (
    <div
      style={{
        ...shimmer,
        width: w,
        height: h,
        borderRadius: radius,
      }}
    />
  );
}

export default function AdminLoading() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#fff',
        color: tokens.color.text,
        fontFamily: '"Manrope", system-ui, -apple-system, "Segoe UI", sans-serif',
        overflowX: 'hidden',
        maxWidth: '100vw',
      }}
    >
      <style>{`
        @keyframes clicka-admin-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .clicka-admin-loading-sidebar { display: none; }
        @media (min-width: 768px) {
          .clicka-admin-loading-sidebar { display: flex; }
          .clicka-admin-loading-main-padding { padding: 32px 40px 56px !important; }
          .clicka-admin-loading-header-padding { padding: 0 20px !important; }
          .clicka-admin-loading-header { height: ${HEADER_HEIGHT_DESKTOP}px !important; }
        }
      `}</style>

      {/* Header skeleton */}
      <header
        className="clicka-admin-loading-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '0.5px solid rgba(0,0,0,0.06)',
          height: HEADER_HEIGHT_MOBILE,
        }}
      >
        <div
          className="clicka-admin-loading-header-padding"
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '0 16px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: tokens.gradient.brand,
              opacity: 0.4,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Bar w={140} h={16} />
          </div>
          <Bar w={44} h={26} radius={999} />
          <Bar w={36} h={36} radius={999} />
        </div>
      </header>

      {/* Body */}
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'flex-start',
          width: '100%',
          minWidth: 0,
        }}
      >
        {/* Sidebar skeleton (desktop only) */}
        <aside
          className="clicka-admin-loading-sidebar"
          style={{
            width: 240,
            flexShrink: 0,
            padding: '32px 16px',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Bar key={i} w="85%" h={32} />
          ))}
        </aside>

        {/* Main */}
        <main
          className="clicka-admin-loading-main-padding"
          style={{
            flex: 1,
            minWidth: 0,
            maxWidth: 760,
            marginInline: 'auto',
            padding: '16px 12px 96px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* Subnav chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <Bar w={70} h={30} radius={999} />
            <Bar w={90} h={30} radius={999} />
            <Bar w={60} h={30} radius={999} />
            <Bar w={80} h={30} radius={999} />
          </div>

          {/* URL bar */}
          <Bar w="60%" h={18} />

          {/* Section title */}
          <Bar w="40%" h={22} />
          <Bar w="80%" h={14} />

          {/* Card */}
          <div
            style={{
              ...shimmer,
              height: 180,
              borderRadius: 16,
              marginTop: 8,
            }}
          />

          <Bar w="35%" h={20} />
          <div
            style={{
              ...shimmer,
              height: 120,
              borderRadius: 14,
            }}
          />

          <Bar w="50%" h={20} />
          <div
            style={{
              ...shimmer,
              height: 220,
              borderRadius: 14,
            }}
          />
        </main>
      </div>
    </div>
  );
}

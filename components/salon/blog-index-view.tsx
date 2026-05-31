import { publicImageUrl } from '@/lib/public-image-url';
import type { PublicSalonBlogPost } from '@/lib/salon-blog';

type Props = {
  salonName: string;
  homeUrl: string;
  blogIndexUrl: string;
  primaryColor: string;
  blogSectionTitle: string;
  posts: PublicSalonBlogPost[];
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' });
}

function coverSrc(url: string): string {
  if (!url) return '';
  return publicImageUrl(url, { width: 640, format: 'webp', quality: 72 });
}

export function BlogIndexView({
  salonName,
  homeUrl,
  blogIndexUrl,
  primaryColor,
  blogSectionTitle,
  posts,
}: Props) {
  return (
    <main
      style={{
        maxWidth: 920,
        margin: '0 auto',
        padding: '40px 20px 80px',
        fontFamily: 'system-ui, sans-serif',
        color: '#111827',
        lineHeight: 1.6,
      }}
    >
      <a
        href={homeUrl}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: '#6b7280',
          textDecoration: 'none',
          marginBottom: 24,
        }}
      >
        ← Обратно към {salonName}
      </a>

      <header style={{ marginBottom: 32 }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: primaryColor }}>
          {blogSectionTitle}
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', lineHeight: 1.2 }}>
          {blogSectionTitle} от {salonName}
        </h1>
        <p style={{ margin: '12px 0 0', color: '#6b7280', maxWidth: 640 }}>
          Съвети, новини и полезна информация от екипа ни.
        </p>
      </header>

      {posts.length === 0 ? (
        <p style={{ color: '#6b7280' }}>Все още няма публикувани статии.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 20,
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
          }}
        >
          {posts.map((post) => {
            const href = `${blogIndexUrl}/${encodeURIComponent(post.slug)}`;
            const img = coverSrc(post.coverImageUrl);
            return (
              <article
                key={post.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                {img ? (
                  <a href={href} style={{ display: 'block', aspectRatio: '16/9', overflow: 'hidden' }}>
                    <img
                      src={img}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  </a>
                ) : null}
                <div style={{ padding: '16px 18px 18px' }}>
                  {post.publishedAt ? (
                    <time
                      dateTime={post.publishedAt}
                      style={{ fontSize: 12, color: '#9ca3af' }}
                    >
                      {formatDate(post.publishedAt)}
                    </time>
                  ) : null}
                  <h2 style={{ margin: '8px 0 0', fontSize: 18, lineHeight: 1.35 }}>
                    <a href={href} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {post.title}
                    </a>
                  </h2>
                  {post.excerpt ? (
                    <p style={{ margin: '8px 0 0', fontSize: 14, color: '#6b7280' }}>{post.excerpt}</p>
                  ) : null}
                  <a
                    href={href}
                    style={{
                      display: 'inline-block',
                      marginTop: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      color: primaryColor,
                      textDecoration: 'none',
                    }}
                  >
                    Прочети →
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

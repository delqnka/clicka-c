import { publicImageUrl } from '@/lib/public-image-url';
import type { PublicSalonBlogPost } from '@/lib/salon-blog-shared';

type Props = {
  salonName: string;
  homeUrl: string;
  blogIndexUrl: string;
  primaryColor: string;
  blogSectionTitle: string;
  post: PublicSalonBlogPost;
  related: PublicSalonBlogPost[];
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' });
}

function coverSrc(url: string): string {
  if (!url) return '';
  return publicImageUrl(url, { width: 1200, format: 'webp', quality: 78 });
}

const articleStyles = `
  .clicka-blog-article h2 { font-size: 1.35rem; margin: 1.75rem 0 0.75rem; line-height: 1.3; }
  .clicka-blog-article h3 { font-size: 1.15rem; margin: 1.5rem 0 0.5rem; line-height: 1.35; }
  .clicka-blog-article p { margin: 0 0 1rem; }
  .clicka-blog-article ul { margin: 0 0 1rem; padding-left: 1.25rem; }
  .clicka-blog-article li { margin-bottom: 0.35rem; }
  .clicka-blog-article a { color: var(--blog-primary); text-decoration: underline; }
  .clicka-blog-article strong { font-weight: 600; }
`;

export function BlogPostView({
  salonName,
  homeUrl,
  blogIndexUrl,
  primaryColor,
  blogSectionTitle,
  post,
  related,
}: Props) {
  const cover = coverSrc(post.coverImageUrl);

  return (
    <main
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '40px 20px 80px',
        fontFamily: 'system-ui, sans-serif',
        color: '#111827',
        lineHeight: 1.7,
        ['--blog-primary' as string]: primaryColor,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: articleStyles }} />

      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginBottom: 24, fontSize: 13 }}>
        <a href={homeUrl} style={{ color: '#6b7280', textDecoration: 'none' }}>
          {salonName}
        </a>
        <span style={{ color: '#d1d5db' }}>/</span>
        <a href={blogIndexUrl} style={{ color: '#6b7280', textDecoration: 'none' }}>
          {blogSectionTitle}
        </a>
      </nav>

      <article>
        {post.publishedAt ? (
          <time dateTime={post.publishedAt} style={{ fontSize: 13, color: '#9ca3af' }}>
            {formatDate(post.publishedAt)}
          </time>
        ) : null}

        <h1
          style={{
            margin: '8px 0 16px',
            fontSize: 'clamp(1.75rem, 4vw, 2.35rem)',
            lineHeight: 1.2,
          }}
        >
          {post.title}
        </h1>

        {post.excerpt ? (
          <p style={{ margin: '0 0 24px', fontSize: 17, color: '#4b5563' }}>{post.excerpt}</p>
        ) : null}

        {cover ? (
          <img
            src={cover}
            alt=""
            style={{
              width: '100%',
              borderRadius: 16,
              marginBottom: 28,
              aspectRatio: '16/9',
              objectFit: 'cover',
            }}
          />
        ) : null}

        <div
          className="clicka-blog-article"
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />
      </article>

      <div
        style={{
          marginTop: 40,
          padding: '20px 22px',
          borderRadius: 14,
          background: `color-mix(in srgb, ${primaryColor} 12%, #fff)`,
          border: `1px solid color-mix(in srgb, ${primaryColor} 25%, #e5e7eb)`,
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>Хареса ви статията?</p>
        <p style={{ margin: '6px 0 14px', fontSize: 14, color: '#4b5563' }}>
          Запазете час онлайн при {salonName}.
        </p>
        <a
          href={homeUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 10,
            padding: '10px 18px',
            background: primaryColor,
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          Към сайта и резервация
        </a>
      </div>

      {related.length > 0 ? (
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Още статии</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {related.map((item) => (
              <li key={item.id}>
                <a
                  href={`${blogIndexUrl}/${encodeURIComponent(item.slug)}`}
                  style={{ color: primaryColor, textDecoration: 'none', fontWeight: 500 }}
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

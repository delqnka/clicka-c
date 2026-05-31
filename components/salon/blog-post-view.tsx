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
  .clicka-blog-article { font-family: inherit; }
  .clicka-blog-article h2 { font-size: 1.35rem; margin: 1.75rem 0 0.75rem; line-height: 1.3; font-weight: 600; }
  .clicka-blog-article h3 { font-size: 1.15rem; margin: 1.5rem 0 0.5rem; line-height: 1.35; font-weight: 600; }
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
      className="client-site mx-auto min-h-screen max-w-[760px] px-5 py-10 pb-20 text-[#111827] leading-[1.7]"
      style={{ ['--blog-primary' as string]: primaryColor }}
    >
      <style dangerouslySetInnerHTML={{ __html: articleStyles }} />

      <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]" aria-label="Breadcrumb">
        <a href={homeUrl} className="text-[#6b7280] no-underline">
          {salonName}
        </a>
        <span className="text-[#d1d5db]">/</span>
        <a href={blogIndexUrl} className="font-semibold no-underline" style={{ color: primaryColor }}>
          {blogSectionTitle}
        </a>
      </nav>

      <article itemScope itemType="https://schema.org/BlogPosting">
        <header>
          {post.publishedAt ? (
            <time dateTime={post.publishedAt} className="text-[13px] text-[#9ca3af]" itemProp="datePublished">
              {formatDate(post.publishedAt)}
            </time>
          ) : null}

          <h1 className="my-2 mb-4 text-[clamp(1.75rem,4vw,2.35rem)] leading-tight" itemProp="headline">
            {post.title}
          </h1>

          {post.excerpt ? (
            <p className="mb-6 mt-0 text-[17px] text-[#4b5563]" itemProp="description">
              {post.excerpt}
            </p>
          ) : null}
        </header>

        {cover ? (
          <img
            src={cover}
            alt={post.title}
            className="mb-7 aspect-video w-full rounded-2xl object-cover"
            itemProp="image"
          />
        ) : null}

        <div
          className="clicka-blog-article"
          itemProp="articleBody"
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />
      </article>

      <div
        className="mt-10 rounded-[14px] border px-[22px] py-5"
        style={{
          background: `color-mix(in srgb, ${primaryColor} 12%, #fff)`,
          borderColor: `color-mix(in srgb, ${primaryColor} 25%, #e5e7eb)`,
        }}
      >
        <p className="m-0 font-semibold">Хареса ви статията?</p>
        <p className="mb-3.5 mt-1.5 text-sm text-[#4b5563]">
          Запазете час онлайн при {salonName}.
        </p>
        <a
          href={homeUrl}
          className="inline-flex items-center rounded-[10px] px-[18px] py-2.5 text-sm font-semibold text-white no-underline"
          style={{ background: primaryColor }}
        >
          Към сайта и резервация
        </a>
      </div>

      {related.length > 0 ? (
        <section className="mt-12" aria-label="Още статии">
          <h2 className="mb-4 text-lg">Още статии</h2>
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {related.map((item) => (
              <li key={item.id}>
                <a
                  href={`${blogIndexUrl}/${encodeURIComponent(item.slug)}`}
                  className="font-medium no-underline"
                  style={{ color: primaryColor }}
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

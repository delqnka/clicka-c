import { publicImageUrl } from '@/lib/public-image-url';
import type { PublicSalonBlogPost } from '@/lib/salon-blog-shared';

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
      className="client-site mx-auto min-h-screen max-w-[920px] px-5 py-10 pb-20 text-[#111827]"
      style={{ ['--salon-primary' as string]: primaryColor }}
    >
      <a
        href={homeUrl}
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-[#6b7280] no-underline"
      >
        ← Обратно към {salonName}
      </a>

      <header className="mb-8">
        <p className="mb-2 text-[13px] font-semibold" style={{ color: primaryColor }}>
          {blogSectionTitle}
        </p>
        <h1 className="m-0 text-[clamp(1.75rem,4vw,2.25rem)] leading-tight">
          {blogSectionTitle} от {salonName}
        </h1>
      </header>

      {posts.length === 0 ? (
        <p className="text-[#6b7280]">Все още няма публикувани статии.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-5">
          {posts.map((post) => {
            const href = `${blogIndexUrl}/${encodeURIComponent(post.slug)}`;
            const img = coverSrc(post.coverImageUrl);
            return (
              <article
                key={post.id}
                className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              >
                {img ? (
                  <a href={href} className="block aspect-video overflow-hidden">
                    <img
                      src={img}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </a>
                ) : null}
                <div className="px-[18px] py-4 pb-[18px]">
                  {post.publishedAt ? (
                    <time dateTime={post.publishedAt} className="text-xs text-[#9ca3af]">
                      {formatDate(post.publishedAt)}
                    </time>
                  ) : null}
                  <h2 className="mb-0 mt-2 text-lg leading-snug">
                    <a href={href} className="text-inherit no-underline">
                      {post.title}
                    </a>
                  </h2>
                  {post.excerpt ? (
                    <p className="mb-0 mt-2 text-sm text-[#6b7280]">{post.excerpt}</p>
                  ) : null}
                  <a
                    href={href}
                    className="mt-3 inline-block text-[13px] font-semibold no-underline"
                    style={{ color: primaryColor }}
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

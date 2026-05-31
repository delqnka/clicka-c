export const DEFAULT_BLOG_SECTION_TITLE = 'Блог';

export function resolveBlogSectionTitle(raw: unknown): string {
  const title = String(raw ?? '').trim();
  return title || DEFAULT_BLOG_SECTION_TITLE;
}

export type BlogPostStatus = 'draft' | 'published';

export type AdminSalonBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  bodyMarkdown: string;
  coverImageUrl: string;
  status: BlogPostStatus;
  publishedAt: string | null;
  metaTitle: string;
  metaDescription: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PublicSalonBlogPost = AdminSalonBlogPost & {
  bodyHtml: string;
};

export function normalizeBlogPostStatus(raw: unknown): BlogPostStatus {
  return String(raw ?? '').trim().toLowerCase() === 'published' ? 'published' : 'draft';
}

export function newEmptyBlogPost(): AdminSalonBlogPost {
  return {
    id: '',
    title: '',
    slug: '',
    excerpt: '',
    bodyMarkdown: '',
    coverImageUrl: '',
    status: 'draft',
    publishedAt: null,
    metaTitle: '',
    metaDescription: '',
    createdAt: null,
    updatedAt: null,
  };
}

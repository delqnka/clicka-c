import type { AdminSalonBlogPost } from '@/lib/salon-blog-shared';

/** Google typically displays ~50–60 characters for title snippets. */
export const BLOG_META_TITLE_MAX = 60;

/** Standard meta description limit for search snippets. */
export const BLOG_META_DESC_MAX = 160;

export function stripMarkdownToPlain(text: string): string {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^-\s+/gm, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncateMetaText(text: string, max: number): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed.length <= max) return trimmed;

  const slice = trimmed.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace >= Math.floor(max * 0.55)) {
    return `${slice.slice(0, lastSpace).trim()}…`;
  }
  return `${slice.trim()}…`;
}

/** Primary keyword = article title; keep within snippet-friendly length. */
export function suggestBlogMetaTitle(title: string): string {
  const clean = stripMarkdownToPlain(title);
  if (!clean) return '';
  return truncateMetaText(clean, BLOG_META_TITLE_MAX);
}

/**
 * Prefer excerpt; otherwise first sentence/paragraph from body.
 * Target 150–160 chars, no mid-word cuts when possible.
 */
export function suggestBlogMetaDescription(excerpt: string, bodyMarkdown: string): string {
  const fromExcerpt = stripMarkdownToPlain(excerpt);
  if (fromExcerpt.length >= 40) {
    return truncateMetaText(fromExcerpt, BLOG_META_DESC_MAX);
  }

  const body = stripMarkdownToPlain(bodyMarkdown);
  if (!body) return fromExcerpt ? truncateMetaText(fromExcerpt, BLOG_META_DESC_MAX) : '';

  const sentenceMatch = body.match(/^(.{40,}?[.!?])(?:\s|$)/);
  const firstSentence = sentenceMatch?.[1]?.trim();
  const source = fromExcerpt || firstSentence || body;

  return truncateMetaText(source, BLOG_META_DESC_MAX);
}

export function withAutoBlogSeoMeta(post: AdminSalonBlogPost): AdminSalonBlogPost {
  const metaTitle = post.metaTitle.trim() || suggestBlogMetaTitle(post.title);
  const metaDescription =
    post.metaDescription.trim() || suggestBlogMetaDescription(post.excerpt, post.bodyMarkdown);

  return {
    ...post,
    metaTitle,
    metaDescription,
  };
}

export function applyAutoBlogSeoMetaPatch(
  post: AdminSalonBlogPost,
  opts?: { titleTouched?: boolean; descriptionTouched?: boolean },
): Partial<AdminSalonBlogPost> {
  const patch: Partial<AdminSalonBlogPost> = {};
  if (!opts?.titleTouched) {
    patch.metaTitle = suggestBlogMetaTitle(post.title);
  }
  if (!opts?.descriptionTouched) {
    patch.metaDescription = suggestBlogMetaDescription(post.excerpt, post.bodyMarkdown);
  }
  return patch;
}

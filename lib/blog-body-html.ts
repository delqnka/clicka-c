import { renderBlogMarkdown } from '@/lib/blog-markdown';

function normalizeHeadingText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Drop a leading heading when it repeats the post title (common copy-paste mistake). */
export function stripDuplicateTitleFromBodyHtml(html: string, title: string): string {
  const wanted = title.trim().toLowerCase();
  if (!wanted) return html;

  return html.replace(
    /^\s*<h[23]>([\s\S]*?)<\/h[23]>\s*/i,
    (match, inner) => {
      const heading = normalizeHeadingText(String(inner));
      if (heading === wanted || heading.startsWith(wanted) || wanted.startsWith(heading)) {
        return '';
      }
      return match;
    },
  );
}

export function renderBlogBodyHtml(markdown: string, title: string): string {
  const html = renderBlogMarkdown(markdown);
  return stripDuplicateTitleFromBodyHtml(html, title);
}

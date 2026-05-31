function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMarkdown(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
    const safeHref = String(href).trim();
    if (!/^https?:\/\//i.test(safeHref)) return escapeHtml(String(label));
    return `<a href="${escapeHtml(safeHref)}" rel="noopener noreferrer" target="_blank">${escapeHtml(String(label))}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return out;
}

function blockToHtml(block: string): string {
  const trimmed = block.trim();
  if (!trimmed) return '';

  const lines = trimmed.split('\n');
  if (lines.every((line) => /^-\s+/.test(line.trim()))) {
    const items = lines
      .map((line) => line.trim().replace(/^-\s+/, ''))
      .filter(Boolean)
      .map((line) => `<li>${inlineMarkdown(line)}</li>`)
      .join('');
    return `<ul>${items}</ul>`;
  }

  if (trimmed.startsWith('### ')) {
    return `<h3>${inlineMarkdown(trimmed.slice(4).trim())}</h3>`;
  }
  if (trimmed.startsWith('## ')) {
    return `<h2>${inlineMarkdown(trimmed.slice(3).trim())}</h2>`;
  }
  if (trimmed.startsWith('# ')) {
    return `<h2>${inlineMarkdown(trimmed.slice(2).trim())}</h2>`;
  }

  return `<p>${inlineMarkdown(trimmed.replace(/\n/g, ' '))}</p>`;
}

/** Minimal Markdown → safe HTML for blog posts. */
export function renderBlogMarkdown(markdown: string): string {
  const blocks = String(markdown ?? '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(blockToHtml)
    .filter(Boolean);
  return blocks.join('\n');
}

'use client';

import { Camera, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { toBlogSlug } from '@/lib/blog-slug';
import type { AdminSalonBlogPost } from '@/lib/salon-blog-shared';
import { newEmptyBlogPost } from '@/lib/salon-blog-shared';

const GRADIENT_PRIMARY: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  borderRadius: 10,
  border: 'none',
  color: '#fff',
  background: 'linear-gradient(135deg, #FF4FD8 0%, #7C3AED 100%)',
  boxShadow: '0 8px 20px rgba(124,58,237,0.28)',
  padding: '9px 16px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const SAVE_GREEN: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,
  border: 'none',
  color: '#fff',
  background: '#16A34A',
  padding: '7px 14px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

type Props = {
  posts: AdminSalonBlogPost[];
  blogTitle: string;
  isMobile: boolean;
  busyKey: string;
  inp: CSSProperties;
  blogPreviewBase: string;
  onPatchPost: (index: number, patch: Partial<AdminSalonBlogPost>) => AdminSalonBlogPost[];
  onReplacePosts: (posts: AdminSalonBlogPost[]) => AdminSalonBlogPost[];
  onBlogTitleChange: (title: string) => void;
  onUploadCover: (postIndex: number, file: File | null) => void | Promise<void>;
  onSaveDraft: () => void | Promise<void>;
  onPublish: (index: number) => void | Promise<void>;
  onUnpublish: (index: number) => void | Promise<void>;
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function AutoGrowTextarea({
  value,
  onChange,
  style,
  minHeight = 280,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minHeight?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
  }, [value, minHeight]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      style={{
        ...style,
        minHeight,
        resize: 'vertical',
        overflow: 'auto',
        lineHeight: 1.55,
      }}
      {...rest}
    />
  );
}

export function SalonBlogSection({
  posts,
  blogTitle,
  isMobile,
  busyKey,
  inp,
  blogPreviewBase,
  onPatchPost,
  onReplacePosts,
  onBlogTitleChange,
  onUploadCover,
  onSaveDraft,
  onPublish,
  onUnpublish,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  function postKey(post: AdminSalonBlogPost, index: number) {
    return post.id || `draft-${index}`;
  }

  function isExpanded(post: AdminSalonBlogPost, index: number) {
    const key = postKey(post, index);
    if (expandedIds.size === 0 && index === 0) return true;
    return expandedIds.has(key);
  }

  function toggleExpanded(post: AdminSalonBlogPost, index: number) {
    const key = postKey(post, index);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function updatePost(index: number, patch: Partial<AdminSalonBlogPost>) {
    onPatchPost(index, patch);
  }

  function removePost(index: number) {
    onReplacePosts(posts.filter((_, i) => i !== index));
  }

  function addPost() {
    onReplacePosts([newEmptyBlogPost(), ...posts]);
    setExpandedIds(new Set(['draft-0']));
  }

  function onTitleBlur(index: number) {
    const post = posts[index];
    if (!post) return;
    if (!post.slug.trim() && post.title.trim()) {
      updatePost(index, { slug: toBlogSlug(post.title) });
    }
  }

  const textareaStyle: CSSProperties = {
    ...inp,
    minHeight: undefined,
    fontFamily: 'inherit',
    whiteSpace: 'pre-wrap',
  };

  return (
    <div style={{ display: 'grid', gap: isMobile ? 14 : 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <button type="button" style={GRADIENT_PRIMARY} onClick={addPost}>
          <Plus size={15} strokeWidth={2.25} />
          Нова статия
        </button>
        <button
          type="button"
          style={{ ...SAVE_GREEN, background: '#374151' }}
          disabled={busyKey === 'blog'}
          onClick={() => void onSaveDraft()}
        >
          {busyKey === 'blog' ? 'Запазване…' : 'Запази чернова'}
        </button>
      </div>

      <label style={{ display: 'grid', gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
          Име на секцията на сайта
        </span>
        <input
          style={inp}
          value={blogTitle}
          onChange={(e) => onBlogTitleChange(e.target.value)}
          placeholder="Блог"
          maxLength={60}
        />
      </label>

      {posts.length === 0 ? (
        <div
          style={{
            border: '1px dashed #d1d5db',
            borderRadius: 12,
            padding: '24px 16px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: 14,
          }}
        >
          Няма статии.
        </div>
      ) : null}

      {posts.map((post, index) => {
        const key = postKey(post, index);
        const open = isExpanded(post, index);
        const previewUrl =
          post.status === 'published' && post.slug
            ? `${blogPreviewBase}/blog/${encodeURIComponent(post.slug)}`
            : null;

        return (
          <div
            key={key}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            <button
              type="button"
              onClick={() => toggleExpanded(post, index)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: isMobile ? '14px 14px' : '14px 16px',
                border: 'none',
                background: open ? '#fafafa' : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 15, display: 'block' }}>
                  {post.title.trim() || `Статия ${index + 1}`}
                </strong>
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  {post.status === 'published' ? 'Публикувана' : 'Чернова'}
                  {post.publishedAt ? ` · ${formatDate(post.publishedAt)}` : ''}
                </span>
              </div>
              <ChevronDown
                size={18}
                style={{
                  flexShrink: 0,
                  transform: open ? 'rotate(180deg)' : 'none',
                  transition: 'transform 150ms ease',
                  color: '#6b7280',
                }}
              />
            </button>

            {open ? (
              <div
                style={{
                  padding: isMobile ? '0 14px 14px' : '0 16px 16px',
                  display: 'grid',
                  gap: 12,
                  borderTop: '1px solid #f3f4f6',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingTop: 12,
                  }}
                >
                  {previewUrl ? (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: '#7C3AED', textDecoration: 'none' }}
                    >
                      Преглед ↗
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removePost(index)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 13,
                    }}
                  >
                    <Trash2 size={14} />
                    Изтрий
                  </button>
                </div>

                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Заглавие</span>
                  <input
                    style={inp}
                    value={post.title}
                    onChange={(e) => updatePost(index, { title: e.target.value })}
                    onBlur={() => onTitleBlur(index)}
                    placeholder="Заглавие на статията"
                  />
                </label>

                <div style={{ display: 'grid', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Снимка</span>
                  <div
                    style={{
                      display: 'grid',
                      gap: 10,
                      gridTemplateColumns: isMobile ? '1fr' : 'minmax(140px, 220px) 1fr',
                      alignItems: 'start',
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: '16/10',
                        borderRadius: 12,
                        border: '1px dashed #d1d5db',
                        background: '#f9fafb',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {post.coverImageUrl ? (
                        <img
                          src={post.coverImageUrl}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: 12, color: '#9ca3af', padding: 12, textAlign: 'center' }}>
                          Без снимка
                        </span>
                      )}
                    </div>
                    <label
                      style={{
                        ...GRADIENT_PRIMARY,
                        width: 'fit-content',
                        cursor: busyKey === `upload-blog-${index}` ? 'wait' : 'pointer',
                        opacity: busyKey === `upload-blog-${index}` ? 0.7 : 1,
                      }}
                    >
                      <Camera size={15} />
                      {post.coverImageUrl ? 'Смени снимката' : 'Качи снимка'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={busyKey === `upload-blog-${index}`}
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          void onUploadCover(index, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>

                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    Кратко описание
                  </span>
                  <textarea
                    style={{ ...inp, minHeight: 72, resize: 'vertical' }}
                    value={post.excerpt}
                    onChange={(e) => updatePost(index, { excerpt: e.target.value })}
                    placeholder="Кратко описание за списъка със статии"
                  />
                </label>

                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Текст</span>
                  <AutoGrowTextarea
                    style={textareaStyle}
                    value={post.bodyMarkdown}
                    onChange={(e) => updatePost(index, { bodyMarkdown: e.target.value })}
                    placeholder="Текст на статията…"
                    minHeight={isMobile ? 320 : 280}
                  />
                </label>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {post.status === 'published' ? (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#16A34A',
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: 999,
                        padding: '6px 12px',
                      }}
                    >
                      Публикувана{post.publishedAt ? ` · ${formatDate(post.publishedAt)}` : ''}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#6b7280',
                        background: '#f3f4f6',
                        borderRadius: 999,
                        padding: '6px 12px',
                      }}
                    >
                      Чернова
                    </span>
                  )}
                  {post.status !== 'published' ? (
                    <button
                      type="button"
                      style={SAVE_GREEN}
                      disabled={busyKey === 'blog'}
                      onClick={() => void onPublish(index)}
                    >
                      {busyKey === 'blog' ? 'Публикуване…' : 'Публикувай'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      style={{
                        ...SAVE_GREEN,
                        background: '#fff',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        boxShadow: 'none',
                      }}
                      disabled={busyKey === 'blog'}
                      onClick={() => void onUnpublish(index)}
                    >
                      В чернова
                    </button>
                  )}
                </div>

                <details>
                  <summary style={{ fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                    URL и SEO
                  </summary>
                  <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                    <label style={{ display: 'grid', gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>URL (slug)</span>
                      <input
                        style={inp}
                        value={post.slug}
                        onChange={(e) => updatePost(index, { slug: e.target.value })}
                        placeholder="grizha-za-kosata-zimata"
                      />
                    </label>
                    <label style={{ display: 'grid', gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Meta title</span>
                      <input
                        style={inp}
                        value={post.metaTitle}
                        onChange={(e) => updatePost(index, { metaTitle: e.target.value })}
                        placeholder={post.title || 'Заглавие за Google'}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        Meta description
                      </span>
                      <textarea
                        style={{ ...inp, minHeight: 64, resize: 'vertical' }}
                        value={post.metaDescription}
                        onChange={(e) => updatePost(index, { metaDescription: e.target.value })}
                        placeholder={post.excerpt || 'Описание за търсачките'}
                      />
                    </label>
                  </div>
                </details>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

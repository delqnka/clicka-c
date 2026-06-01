'use client';

import { Camera, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
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
  onPublish: (index: number) => void | Promise<void>;
  onUnpublish: (index: number) => void | Promise<void>;
  onActiveIndexChange?: (index: number) => void;
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short', year: 'numeric' });
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
  onPublish,
  onUnpublish,
  onActiveIndexChange,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const saving = busyKey === 'blog';

  useEffect(() => {
    if (activeIndex >= posts.length) {
      const next = Math.max(0, posts.length - 1);
      setActiveIndex(next);
      onActiveIndexChange?.(next);
    }
  }, [activeIndex, posts.length, onActiveIndexChange]);

  useEffect(() => {
    onActiveIndexChange?.(activeIndex);
  }, [activeIndex, onActiveIndexChange]);

  const post = posts[activeIndex];
  const previewUrl =
    post?.status === 'published' && post.slug
      ? `${blogPreviewBase}/blog/${encodeURIComponent(post.slug)}`
      : null;

  function updatePost(index: number, patch: Partial<AdminSalonBlogPost>) {
    onPatchPost(index, patch);
  }

  function selectPost(index: number) {
    setActiveIndex(index);
    onActiveIndexChange?.(index);
  }

  function addPost() {
    onReplacePosts([newEmptyBlogPost(), ...posts]);
    selectPost(0);
  }

  function removePost(index: number) {
    onReplacePosts(posts.filter((_, i) => i !== index));
    setActiveIndex((i) => {
      const next = Math.max(0, Math.min(i, posts.length - 2));
      onActiveIndexChange?.(next);
      return next;
    });
  }

  function onTitleBlur(index: number) {
    const current = posts[index];
    if (!current?.slug.trim() && current?.title.trim()) {
      updatePost(index, { slug: toBlogSlug(current.title) });
    }
  }

  const textareaStyle: CSSProperties = {
    ...inp,
    minHeight: 360,
    height: 360,
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
  };

  return (
    <div style={{ display: 'grid', gap: isMobile ? 16 : 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <button type="button" style={GRADIENT_PRIMARY} onClick={addPost}>
          <Plus size={15} strokeWidth={2.25} />
          Нова статия
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
            padding: '32px 16px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: 14,
          }}
        >
          Няма статии. Натиснете „Нова статия“, за да започнете.
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {posts.map((item, index) => {
              const selected = index === activeIndex;
              const label = item.title.trim() || `Статия ${index + 1}`;
              return (
                <button
                  key={item.id || `draft-${index}`}
                  type="button"
                  onClick={() => selectPost(index)}
                  style={{
                    flexShrink: 0,
                    borderRadius: 10,
                    border: selected ? '2px solid #7C3AED' : '1px solid #e5e7eb',
                    background: selected ? '#F5F3FF' : '#fff',
                    padding: '8px 14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    maxWidth: 220,
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#111827',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </span>
                  <span style={{ fontSize: 11, color: item.status === 'published' ? '#16A34A' : '#9ca3af' }}>
                    {item.status === 'published' ? 'Публикувана' : 'Чернова'}
                  </span>
                </button>
              );
            })}
          </div>

          {post ? (
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 14,
                padding: isMobile ? 14 : 18,
                display: 'grid',
                gap: 14,
                background: '#fff',
              }}
            >
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Заглавие</span>
                <input
                  style={inp}
                  value={post.title}
                  onChange={(e) => updatePost(activeIndex, { title: e.target.value })}
                  onBlur={() => onTitleBlur(activeIndex)}
                  placeholder="Заглавие на статията"
                />
              </label>

              <div style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Снимка на корицата</span>
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
                      cursor: busyKey === `upload-blog-${activeIndex}` ? 'wait' : 'pointer',
                      opacity: busyKey === `upload-blog-${activeIndex}` ? 0.7 : 1,
                    }}
                  >
                    <Camera size={15} />
                    {post.coverImageUrl ? 'Смени снимката' : 'Качи снимка'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      disabled={busyKey === `upload-blog-${activeIndex}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        void onUploadCover(activeIndex, file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>

              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Текст на статията</span>
                <textarea
                  style={textareaStyle}
                  value={post.bodyMarkdown}
                  onChange={(e) => updatePost(activeIndex, { bodyMarkdown: e.target.value })}
                  placeholder="Пишете тук…"
                />
              </label>

              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                  Кратко описание <span style={{ fontWeight: 400, color: '#9ca3af' }}>(по избор)</span>
                </span>
                <textarea
                  style={{ ...inp, minHeight: 72, resize: 'vertical' }}
                  value={post.excerpt}
                  onChange={(e) => updatePost(activeIndex, { excerpt: e.target.value })}
                  placeholder="Показва се в списъка със статии"
                />
              </label>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                  paddingTop: 4,
                  borderTop: '1px solid #f3f4f6',
                }}
              >
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
                    style={{ ...GRADIENT_PRIMARY, padding: '8px 16px', fontSize: 13 }}
                    disabled={saving}
                    onClick={() => void onPublish(activeIndex)}
                  >
                    {saving ? 'Публикуване…' : 'Публикувай'}
                  </button>
                ) : (
                  <button
                    type="button"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 10,
                      background: '#fff',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      padding: '8px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    disabled={saving}
                    onClick={() => void onUnpublish(activeIndex)}
                  >
                    В чернова
                  </button>
                )}

                {previewUrl ? (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 13, color: '#7C3AED', textDecoration: 'none', marginLeft: 'auto' }}
                  >
                    Преглед ↗
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={() => removePost(activeIndex)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 13,
                    marginLeft: previewUrl ? 0 : 'auto',
                  }}
                >
                  <Trash2 size={14} />
                  Изтрий
                </button>
              </div>

              <details>
                <summary style={{ fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                  URL адрес (по избор)
                </summary>
                <label style={{ display: 'grid', gap: 4, marginTop: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Slug</span>
                  <input
                    style={inp}
                    value={post.slug}
                    onChange={(e) => updatePost(activeIndex, { slug: e.target.value })}
                    placeholder="grizha-za-kosata-zimata"
                  />
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    SEO заглавие и описание се генерират автоматично при запазване.
                  </span>
                </label>
              </details>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

'use client';

import { Camera, Trash2 } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { toBlogSlug } from '@/lib/blog-slug';
import type { AdminSalonBlogPost } from '@/lib/salon-blog-shared';
import type { Locale } from '@/lib/i18n';
const GRADIENT_PRIMARY: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  borderRadius: 8,
  border: 'none',
  color: '#fff',
  background: '#000',
  padding: '6px 12px',
  fontSize: 12,
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
  locale: Locale;
};

function formatDate(iso: string | null, locale: Locale): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const tag = locale === 'en' ? 'en-US' : 'bg-BG';
  return d.toLocaleDateString(tag, { day: 'numeric', month: 'short', year: 'numeric' });
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
  locale,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const saving = busyKey === 'blog';
  const isEn = locale === 'en';

  useEffect(() => {
    if (posts.length === 0) {
      if (activeIndex !== 0) setActiveIndex(0);
      return;
    }
    if (activeIndex >= posts.length) {
      setActiveIndex(posts.length - 1);
    }
  }, [activeIndex, posts.length]);

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
      <label style={{ display: 'grid', gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#18181B' }}>
          {isEn ? 'Section name on the site' : 'Име на секцията на сайта'}
        </span>
        <input
          style={inp}
          value={blogTitle}
          onChange={(e) => onBlogTitleChange(e.target.value)}
          placeholder={isEn ? 'Blog' : 'Блог'}
          maxLength={60}
        />
      </label>

      {posts.length === 0 ? (
        <div
          style={{
            padding: '24px 0',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: 14,
          }}
        >
          {isEn ? 'No articles.' : 'Няма статии.'}
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
              const label = item.title.trim() || (isEn ? `Article ${index + 1}` : `Статия ${index + 1}`);
              return (
                <button
                  key={item.id || `draft-${index}`}
                  type="button"
                  onClick={() => selectPost(index)}
                  style={{
                    flexShrink: 0,
                    borderRadius: 10,
                    border: selected ? '2px solid #000' : '1px solid #e5e7eb',
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
                    {item.status === 'published'
                      ? (isEn ? 'Published' : 'Публикувана')
                      : (isEn ? 'Draft' : 'Чернова')}
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
                <span style={{ fontSize: 12, fontWeight: 600, color: '#18181B' }}>{isEn ? 'Title' : 'Заглавие'}</span>
                <input
                  style={inp}
                  value={post.title}
                  onChange={(e) => updatePost(activeIndex, { title: e.target.value })}
                  onBlur={() => onTitleBlur(activeIndex)}
                  placeholder={isEn ? 'Article title' : 'Заглавие на статията'}
                />
              </label>

              <div style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#18181B' }}>{isEn ? 'Cover image' : 'Снимка на корицата'}</span>
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
                        {isEn ? 'No image' : 'Без снимка'}
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
                    {post.coverImageUrl
                      ? (isEn ? 'Change image' : 'Смени снимката')
                      : (isEn ? 'Upload image' : 'Качи снимка')}
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
                <span style={{ fontSize: 12, fontWeight: 600, color: '#18181B' }}>{isEn ? 'Article body' : 'Текст на статията'}</span>
                <textarea
                  style={textareaStyle}
                  value={post.bodyMarkdown}
                  onChange={(e) => updatePost(activeIndex, { bodyMarkdown: e.target.value })}
                  placeholder={isEn ? 'Write here…' : 'Пишете тук…'}
                />
              </label>

              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#18181B' }}>
                  {isEn ? 'Excerpt' : 'Кратко описание'} <span style={{ fontWeight: 400, color: '#9ca3af' }}>{isEn ? '(optional)' : '(по избор)'}</span>
                </span>
                <textarea
                  style={{ ...inp, minHeight: 72, resize: 'vertical' }}
                  value={post.excerpt}
                  onChange={(e) => updatePost(activeIndex, { excerpt: e.target.value })}
                  placeholder={isEn ? 'Shown in the article list' : 'Показва се в списъка със статии'}
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
                    {isEn ? 'Published' : 'Публикувана'}{post.publishedAt ? ` · ${formatDate(post.publishedAt, locale)}` : ''}
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
                    {isEn ? 'Draft' : 'Чернова'}
                  </span>
                )}

                {post.status !== 'published' ? (
                  <button
                    type="button"
                    style={{ ...GRADIENT_PRIMARY, padding: '8px 16px', fontSize: 13 }}
                    disabled={saving}
                    onClick={() => void onPublish(activeIndex)}
                  >
                    {saving
                      ? (isEn ? 'Publishing…' : 'Публикуване…')
                      : (isEn ? 'Publish' : 'Публикувай')}
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
                    {isEn ? 'Move to draft' : 'В чернова'}
                  </button>
                )}

                {previewUrl ? (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 13, color: '#000', textDecoration: 'none', marginLeft: 'auto' }}
                  >
                    {isEn ? 'Preview ↗' : 'Преглед ↗'}
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
                  {isEn ? 'Delete' : 'Изтрий'}
                </button>
              </div>

              <details>
                <summary style={{ fontSize: 13, fontWeight: 600, color: '#18181B', cursor: 'pointer' }}>
                  {isEn ? 'URL slug (optional)' : 'URL адрес (по избор)'}
                </summary>
                <label style={{ display: 'grid', gap: 4, marginTop: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#18181B' }}>Slug</span>
                  <input
                    style={inp}
                    value={post.slug}
                    onChange={(e) => updatePost(activeIndex, { slug: e.target.value })}
                    placeholder="grizha-za-kosata-zimata"
                  />
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {isEn
                      ? 'SEO title and description are generated automatically on save.'
                      : 'SEO заглавие и описание се генерират автоматично при запазване.'}
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

'use client';

import { Camera, Plus, Trash2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { toBlogSlug } from '@/lib/blog-slug';
import type { AdminSalonBlogPost, BlogPostStatus } from '@/lib/salon-blog-shared';
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
  onChange: (posts: AdminSalonBlogPost[]) => void;
  onBlogTitleChange: (title: string) => void;
  onUploadCover: (postIndex: number, file: File | null) => void | Promise<void>;
  onSave: () => void | Promise<void>;
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function SalonBlogSection({
  posts,
  blogTitle,
  isMobile,
  busyKey,
  inp,
  blogPreviewBase,
  onChange,
  onBlogTitleChange,
  onUploadCover,
  onSave,
}: Props) {
  function updatePost(index: number, patch: Partial<AdminSalonBlogPost>) {
    onChange(posts.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function removePost(index: number) {
    onChange(posts.filter((_, i) => i !== index));
  }

  function addPost() {
    onChange([newEmptyBlogPost(), ...posts]);
  }

  function onTitleBlur(index: number) {
    const post = posts[index];
    if (!post) return;
    if (!post.slug.trim() && post.title.trim()) {
      updatePost(index, { slug: toBlogSlug(post.title) });
    }
  }

  return (
    <div style={{ display: 'grid', gap: isMobile ? 14 : 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <button type="button" style={GRADIENT_PRIMARY} onClick={addPost}>
          <Plus size={15} strokeWidth={2.25} />
          Нова статия
        </button>
        <button
          type="button"
          style={SAVE_GREEN}
          disabled={busyKey === 'blog'}
          onClick={() => void onSave()}
        >
          {busyKey === 'blog' ? 'Запазване…' : 'Запази блога'}
        </button>
      </div>

      <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
        Публикувайте статии за по-добро SEO — съвети, нови услуги, сезонни грижи. Markdown:{' '}
        <code>## заглавие</code>, <code>**удебелен**</code>, <code>- списък</code>,{' '}
        <code>[линк](https://...)</code>.
      </p>

      <label style={{ display: 'grid', gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
          Заглавие на секцията на сайта
        </span>
        <input
          style={inp}
          value={blogTitle}
          onChange={(e) => onBlogTitleChange(e.target.value)}
          placeholder="Блог"
          maxLength={60}
        />
        <span style={{ fontSize: 12, color: '#9ca3af' }}>
          Показва се в менюто и на страницата със статии. Празно = „Блог“. Напр. Статии, Новини,
          Съвети.
        </span>
      </label>

      {posts.length === 0 ? (
        <div
          style={{
            border: '1px dashed #d1d5db',
            borderRadius: 12,
            padding: '28px 20px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: 14,
          }}
        >
          Все още няма статии. Добавете първата си публикация за по-добра видимост в Google.
        </div>
      ) : null}

      {posts.map((post, index) => {
        const previewUrl =
          post.status === 'published' && post.slug
            ? `${blogPreviewBase}/blog/${encodeURIComponent(post.slug)}`
            : null;

        return (
          <div
            key={post.id || `new-${index}`}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              padding: isMobile ? 14 : 16,
              display: 'grid',
              gap: 12,
              background: '#fafafa',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <strong style={{ fontSize: 15 }}>
                {post.title.trim() || `Статия ${index + 1}`}
              </strong>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Заглавие</span>
                <input
                  style={inp}
                  value={post.title}
                  onChange={(e) => updatePost(index, { title: e.target.value })}
                  onBlur={() => onTitleBlur(index)}
                  placeholder="Напр. Грижа за косата през зимата"
                />
              </label>

              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>URL адрес (slug)</span>
                <input
                  style={inp}
                  value={post.slug}
                  onChange={(e) => updatePost(index, { slug: e.target.value })}
                  placeholder="grizha-za-kosata-zimata"
                />
              </label>

              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Кратко описание</span>
                <textarea
                  style={{ ...inp, minHeight: 72, resize: 'vertical' }}
                  value={post.excerpt}
                  onChange={(e) => updatePost(index, { excerpt: e.target.value })}
                  placeholder="1–2 изречения за списъка и meta description."
                />
              </label>

              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Съдържание</span>
                <textarea
                  style={{ ...inp, minHeight: 180, resize: 'vertical', fontFamily: 'ui-monospace, monospace' }}
                  value={post.bodyMarkdown}
                  onChange={(e) => updatePost(index, { bodyMarkdown: e.target.value })}
                  placeholder={'## Заглавие\n\nТекст на статията...\n\n- Съвет 1\n- Съвет 2'}
                />
              </label>

              <div style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Корица</span>
                {post.coverImageUrl ? (
                  <img
                    src={post.coverImageUrl}
                    alt=""
                    style={{ width: '100%', maxWidth: 320, borderRadius: 10, objectFit: 'cover' }}
                  />
                ) : null}
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

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
                  gap: 10,
                }}
              >
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Статус</span>
                  <select
                    style={inp}
                    value={post.status}
                    onChange={(e) =>
                      updatePost(index, { status: e.target.value as BlogPostStatus })
                    }
                  >
                    <option value="draft">Чернова</option>
                    <option value="published">Публикувана</option>
                  </select>
                </label>
                <div style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Публикувана на</span>
                  <span style={{ fontSize: 13, color: '#6b7280', paddingTop: 8 }}>
                    {formatDate(post.publishedAt)}
                  </span>
                </div>
              </div>

              <details>
                <summary style={{ fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                  SEO настройки (по избор)
                </summary>
                <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
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
                      placeholder={post.excerpt || 'Описание за търсачките (до ~160 символа)'}
                    />
                  </label>
                </div>
              </details>
            </div>
          </div>
        );
      })}
    </div>
  );
}

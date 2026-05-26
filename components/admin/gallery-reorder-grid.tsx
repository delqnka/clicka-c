'use client';

import { Check, GripVertical, Trash2 } from 'lucide-react';
import type { CSSProperties, PointerEvent } from 'react';
import { useCallback, useRef, useState } from 'react';

const LONG_PRESS_MS = 420;

function reorderList<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

type BtnStyle = CSSProperties;

type Props = {
  images: string[];
  coverImageUrl: string;
  isMobile: boolean;
  btnSmGhost: BtnStyle;
  onReorder: (images: string[]) => void;
  onSetCover: (url: string) => void;
  onRemove: (index: number) => void;
};

export function GalleryReorderGrid({
  images,
  coverImageUrl,
  isMobile,
  btnSmGhost,
  onReorder,
  onSetCover,
  onRemove,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragFromRef = useRef<number | null>(null);
  const dragActiveRef = useRef(false);
  const suppressClickRef = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const resolveIndexFromPoint = useCallback((clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY);
    const cell = el?.closest('[data-gallery-index]');
    if (!cell) return null;
    const raw = cell.getAttribute('data-gallery-index');
    if (raw == null) return null;
    const idx = Number(raw);
    return Number.isFinite(idx) ? idx : null;
  }, []);

  const onItemPointerDown = (e: PointerEvent<HTMLDivElement>, index: number) => {
    if (e.button !== 0) return;
    suppressClickRef.current = false;
    dragActiveRef.current = false;
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      dragActiveRef.current = true;
      dragFromRef.current = index;
      setDragIndex(index);
      setOverIndex(index);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(12);
      }
    }, LONG_PRESS_MS);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onItemPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragActiveRef.current && !longPressTimer.current) return;
    if (dragActiveRef.current) {
      e.preventDefault();
      const idx = resolveIndexFromPoint(e.clientX, e.clientY);
      if (idx != null) setOverIndex(idx);
    }
  };

  const onItemPointerUp = (e: PointerEvent<HTMLDivElement>, index: number) => {
    clearLongPress();
    e.currentTarget.releasePointerCapture(e.pointerId);

    const from = dragFromRef.current;
    const to = overIndex;
    if (dragActiveRef.current && from != null && to != null && from !== to) {
      onReorder(reorderList(images, from, to));
      suppressClickRef.current = true;
    }

    dragActiveRef.current = false;
    dragFromRef.current = null;
    setDragIndex(null);
    setOverIndex(null);
  };

  const onItemPointerCancel = () => {
    clearLongPress();
    dragActiveRef.current = false;
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile
          ? 'repeat(3, minmax(0, 1fr))'
          : 'repeat(auto-fill, minmax(min(140px, 100%), 1fr))',
        gap: isMobile ? 8 : 10,
      }}
    >
      {images.map((url, i) => {
        const isDragging = dragIndex === i;
        const isDropTarget = overIndex === i && dragIndex != null && dragIndex !== i;

        return (
          <div
            key={`${url}-${i}`}
            data-gallery-index={i}
            onPointerDown={e => onItemPointerDown(e, i)}
            onPointerMove={onItemPointerMove}
            onPointerUp={e => onItemPointerUp(e, i)}
            onPointerCancel={onItemPointerCancel}
            style={{
              border: `1px solid ${
                isDropTarget ? '#22c55e' : coverImageUrl === url ? '#18181B' : '#E5E3DE'
              }`,
              borderRadius: isMobile ? 12 : 8,
              overflow: 'hidden',
              background: '#fff',
              touchAction: dragIndex != null ? 'none' : 'manipulation',
              transform: isDragging ? 'scale(1.04)' : isDropTarget ? 'scale(0.98)' : 'none',
              opacity: isDragging ? 0.88 : 1,
              boxShadow: isDragging
                ? '0 12px 28px rgba(0,0,0,0.18)'
                : isDropTarget
                  ? '0 0 0 2px rgba(34,197,94,0.35)'
                  : 'none',
              transition: dragIndex != null ? 'none' : 'transform 0.15s ease, box-shadow 0.15s ease',
              cursor: dragIndex != null ? 'grabbing' : 'grab',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            <div style={{ position: 'relative' }}>
              <img
                src={url}
                alt={`Снимка ${i + 1}`}
                draggable={false}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  objectFit: 'cover',
                  display: 'block',
                  pointerEvents: 'none',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  minWidth: 22,
                  height: 22,
                  padding: '0 6px',
                  borderRadius: 999,
                  background: 'rgba(0,0,0,0.55)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {i + 1}
              </span>
              {dragIndex == null && (
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.92)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#71717A',
                  }}
                  aria-hidden
                >
                  <GripVertical size={14} />
                </span>
              )}
            </div>
            <div
              style={{
                padding: isMobile ? 4 : '6px 8px',
                display: 'flex',
                gap: isMobile ? 4 : 6,
                justifyContent: 'center',
              }}
            >
              <button
                type="button"
                aria-label={coverImageUrl === url ? 'Начална снимка' : 'Задай за cover'}
                style={{
                  ...btnSmGhost,
                  flex: isMobile ? '0 0 auto' : 1,
                  fontSize: isMobile ? 10 : 11,
                  padding: isMobile ? '6px' : '4px 8px',
                  width: isMobile ? 32 : undefined,
                  height: isMobile ? 32 : undefined,
                  borderRadius: isMobile ? 8 : 8,
                  ...(coverImageUrl === url
                    ? { background: '#18181B', color: '#fff', borderColor: '#18181B' }
                    : {}),
                }}
                onClick={e => {
                  e.stopPropagation();
                  if (suppressClickRef.current) return;
                  onSetCover(url);
                }}
              >
                {isMobile ? (
                  <Check size={14} strokeWidth={2.5} />
                ) : coverImageUrl === url ? (
                  'Cover ✓'
                ) : (
                  'Cover'
                )}
              </button>
              <button
                type="button"
                style={{
                  ...btnSmGhost,
                  color: '#EF4444',
                  padding: isMobile ? '6px' : '4px 8px',
                  width: isMobile ? 32 : undefined,
                  height: isMobile ? 32 : undefined,
                  borderRadius: isMobile ? 8 : 8,
                  flex: '0 0 auto',
                }}
                aria-label="Премахни снимка"
                onClick={e => {
                  e.stopPropagation();
                  if (suppressClickRef.current) return;
                  onRemove(i);
                }}
              >
                <Trash2 size={isMobile ? 14 : 12} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

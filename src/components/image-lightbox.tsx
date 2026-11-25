"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const STEP = 0.5;

export type LightboxDetail = { label: string; value: string };

/**
 * A clickable image that opens a lightbox with its details.
 *
 * The lightbox zooms with the +/− buttons, the mouse wheel, a double-click, or
 * the + and − keys, pans by dragging once zoomed, and closes on Escape, the
 * close button, or a click outside the panel.
 */
export function ImageLightbox({
  src,
  alt,
  title,
  subtitle,
  details,
  triggerClassName = "",
  children,
}: {
  src: string;
  alt: string;
  title: string;
  subtitle?: string;
  details?: LightboxDetail[];
  triggerClassName?: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(MIN_SCALE);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => setMounted(true), []);

  const reset = useCallback(() => {
    setScale(MIN_SCALE);
    setOffset({ x: 0, y: 0 });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    reset();
    triggerRef.current?.focus();
  }, [reset]);

  const zoom = useCallback((delta: number) => {
    setScale((current) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number((current + delta).toFixed(2))));
      if (next === MIN_SCALE) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "+" || event.key === "=") zoom(STEP);
      if (event.key === "-" || event.key === "_") zoom(-STEP);
      if (event.key === "0") reset();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close, zoom, reset]);

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (scale <= MIN_SCALE) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, originX: offset.x, originY: offset.y };
    setDragging(true);
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({ x: drag.originX + (event.clientX - drag.startX), y: drag.originY + (event.clientY - drag.startY) });
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const zoomed = scale > MIN_SCALE;
  const moved = offset.x !== 0 || offset.y !== 0;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`image-thumb ${triggerClassName}`.trim()}
        onClick={() => {
          reset();
          setOpen(true);
        }}
        aria-label={`Open ${title} larger`}
        aria-haspopup="dialog"
      >
        {children}
        <span className="image-thumb-zoom" aria-hidden="true"><Maximize2 size={11} /></span>
      </button>

      {mounted && open && createPortal(
        <div
          className="lightbox"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className="lightbox-panel" role="dialog" aria-modal="true" aria-label={title}>
            <header className="lightbox-head">
              <div>
                <b>{title}</b>
                <small>{subtitle ?? "Click outside or press Escape to close."}</small>
              </div>
              <div className="lightbox-tools">
                <button type="button" onClick={() => zoom(-STEP)} disabled={scale <= MIN_SCALE} aria-label="Zoom out" title="Zoom out (−)">
                  <Minus size={15} />
                </button>
                <span className="lightbox-scale" aria-live="polite">{Math.round(scale * 100)}%</span>
                <button type="button" onClick={() => zoom(STEP)} disabled={scale >= MAX_SCALE} aria-label="Zoom in" title="Zoom in (+)">
                  <Plus size={15} />
                </button>
                <button type="button" onClick={reset} disabled={!zoomed && !moved} aria-label="Reset zoom" title="Reset zoom (0)">
                  <RotateCcw size={14} />
                </button>
                <button ref={closeRef} type="button" className="lightbox-close" onClick={close} aria-label="Close image" title="Close (Esc)">
                  <X size={16} />
                </button>
              </div>
            </header>

            <div
              className={`lightbox-stage ${zoomed ? "is-zoomed" : ""} ${dragging ? "is-dragging" : ""}`}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onDoubleClick={() => (zoomed ? reset() : zoom(1))}
              onWheel={(event) => zoom(event.deltaY > 0 ? -STEP / 2 : STEP / 2)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                draggable={false}
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
              />
            </div>

            {details?.length ? (
              <dl className="lightbox-details">
                {details.map((detail) => (
                  <div key={detail.label}>
                    <dt>{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <p className="lightbox-hint">
              <span>Scroll or use + / − to zoom · drag to move · Esc to close</span>
              <a href={src} target="_blank" rel="noreferrer">Open the file in a new tab</a>
            </p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

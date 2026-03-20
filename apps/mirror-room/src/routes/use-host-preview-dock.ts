import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

const STORAGE_KEY = 'mirror-room-host-preview-dock';

export type HostPreviewDock = {
  /** px from viewport right */
  right: number;
  /** px from viewport bottom */
  bottom: number;
  /** outer panel width (px) */
  width: number;
};

const MIN_W = 200;
/** 프리뷰 패널 가로 상한(px). 뷰포트보다 커지지 않게 `clampDock`에서 함께 제한. */
const MAX_PANEL_WIDTH = 1920;
const MIN_RB = 0;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function maxDockWidth(viewportW: number): number {
  return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_W, viewportW - 12));
}

function clampDock(
  d: HostPreviewDock,
  viewportW: number,
  viewportH: number
): HostPreviewDock {
  const w = clamp(d.width, MIN_W, maxDockWidth(viewportW));
  const maxRight = Math.max(0, viewportW - w - 8);
  const estH = Math.min(viewportH * 0.6, w * 0.65);
  const maxBottom = Math.max(0, viewportH - estH - 8);
  return {
    right: clamp(d.right, MIN_RB, maxRight),
    bottom: clamp(d.bottom, MIN_RB, maxBottom),
    width: w,
  };
}

function loadInitialDock(): HostPreviewDock {
  if (typeof window === 'undefined') {
    return { right: 12, bottom: 12, width: 400 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<HostPreviewDock>;
      if (
        typeof p.right === 'number' &&
        typeof p.bottom === 'number' &&
        typeof p.width === 'number'
      ) {
        return clampDock(
          { right: p.right, bottom: p.bottom, width: p.width },
          window.innerWidth,
          window.innerHeight
        );
      }
    }
  } catch {
    /* ignore */
  }
  const w = Math.min(520, Math.floor(window.innerWidth * 0.72));
  return clampDock(
    { right: 12, bottom: 12, width: w },
    window.innerWidth,
    window.innerHeight
  );
}

function persistDock(d: HostPreviewDock): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

export function useHostPreviewDock() {
  const [dock, setDock] = useState<HostPreviewDock>(loadInitialDock);
  const dockRef = useRef(dock);
  useEffect(() => {
    dockRef.current = dock;
  }, [dock]);

  const setDockClamped = useCallback(
    (next: HostPreviewDock | ((prev: HostPreviewDock) => HostPreviewDock)) => {
      setDock((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        const clamped = clampDock(resolved, window.innerWidth, window.innerHeight);
        persistDock(clamped);
        return clamped;
      });
    },
    []
  );

  useEffect(() => {
    const onResize = () => {
      setDockClamped((d) => clampDock(d, window.innerWidth, window.innerHeight));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [setDockClamped]);

  const resetDock = useCallback(() => {
    const w = Math.min(520, Math.floor(window.innerWidth * 0.72));
    setDockClamped(
      clampDock(
        { right: 12, bottom: 12, width: w },
        window.innerWidth,
        window.innerHeight
      )
    );
  }, [setDockClamped]);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startR: number;
    startB: number;
  } | null>(null);

  const onDragHandlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) {
      return;
    }
    e.preventDefault();
    const d = dockRef.current;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startR: d.right,
      startB: d.bottom,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onDragHandlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) {
        return;
      }
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setDockClamped((prev) => ({
        right: drag.startR - dx,
        bottom: drag.startB - dy,
        width: prev.width,
      }));
    },
    [setDockClamped]
  );

  const onDragHandlePointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) {
      return;
    }
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const resizeRef = useRef<{
    pointerId: number;
    startX: number;
    startW: number;
  } | null>(null);

  const onResizePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startW: dockRef.current.width,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onResizePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const r = resizeRef.current;
      if (!r || e.pointerId !== r.pointerId) {
        return;
      }
      const dx = e.clientX - r.startX;
      setDockClamped((prev) => ({
        ...prev,
        width: r.startW + dx,
      }));
    },
    [setDockClamped]
  );

  const onResizePointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const r = resizeRef.current;
    if (!r || e.pointerId !== r.pointerId) {
      return;
    }
    resizeRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  return {
    dock,
    setDockClamped,
    resetDock,
    dragHandleProps: {
      onPointerDown: onDragHandlePointerDown,
      onPointerMove: onDragHandlePointerMove,
      onPointerUp: onDragHandlePointerUp,
      onPointerCancel: onDragHandlePointerUp,
      style: { touchAction: 'none' as const },
    },
    resizeHandleProps: {
      onPointerDown: onResizePointerDown,
      onPointerMove: onResizePointerMove,
      onPointerUp: onResizePointerUp,
      onPointerCancel: onResizePointerUp,
      style: { touchAction: 'none' as const },
    },
  };
}

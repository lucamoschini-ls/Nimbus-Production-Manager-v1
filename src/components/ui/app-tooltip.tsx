"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface AppTooltipProps {
  content: ReactNode;
  children: ReactNode;
  maxWidth?: number;
  delay?: number;
}

export function AppTooltip({
  content,
  children,
  maxWidth = 300,
  delay = 200,
}: AppTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (!wrapRef.current) return;
      // Get rect from the first real child element (skip contents wrapper)
      const el = wrapRef.current.firstElementChild as HTMLElement | null;
      const rect = el ? el.getBoundingClientRect() : wrapRef.current.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      setPos({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
      setVisible(true);
    }, delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, []);

  if (!content) return <>{children}</>;

  return (
    <div
      ref={wrapRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      style={{ display: "contents" }}
    >
      {children}
      {visible &&
        createPortal(
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{
              left: pos.x,
              top: pos.y - 8,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div
              className="bg-white border border-[#e5e5e7] rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] px-3 py-2 text-[12px] font-normal text-[#1d1d1f] leading-normal animate-fade-in"
              style={{ maxWidth, fontFamily: "Outfit, sans-serif" }}
            >
              {content}
            </div>
            {/* Arrow */}
            <div className="flex justify-center -mt-px">
              <div
                className="w-2 h-2 bg-white border-r border-b border-[#e5e5e7] rotate-45"
                style={{ marginTop: -4 }}
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

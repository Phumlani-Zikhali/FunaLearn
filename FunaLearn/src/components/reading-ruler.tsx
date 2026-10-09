"use client";

import * as React from "react";

/**
 * A horizontal highlighted bar that follows the pointer's vertical position,
 * helping readers track the current line. Rendered only when enabled.
 */
export function ReadingRuler() {
  const [y, setY] = React.useState<number | null>(null);

  React.useEffect(() => {
    const handleMove = (event: PointerEvent) => setY(event.clientY);
    const handleLeave = () => setY(null);
    const handleFocus = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement) {
        const bounds = event.target.getBoundingClientRect();
        setY(bounds.top + Math.min(bounds.height / 2, 22));
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerleave", handleLeave);
    window.addEventListener("focusin", handleFocus);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerleave", handleLeave);
      window.removeEventListener("focusin", handleFocus);
    };
  }, []);

  if (y === null) return null;

  const BAND_HEIGHT = 44;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-40"
    >
      {/* Highlighted reading band */}
      <div
        className="absolute inset-x-0 border-y-2 border-primary/60 bg-primary/10"
        style={{
          top: y - BAND_HEIGHT / 2,
          height: BAND_HEIGHT,
        }}
      />
    </div>
  );
}

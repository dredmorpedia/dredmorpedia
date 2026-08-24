"use client";

import { useEffect, useRef, useState } from "react";

export function useFloatingCatalogueTab() {
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const [floating, setFloating] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    let animationFrame: number | null = null;
    const updateFloating = () => {
      if (animationFrame !== null) {
        return;
      }
      animationFrame = requestAnimationFrame(() => {
        animationFrame = null;
        setFloating(sentinel.getBoundingClientRect().top < 0);
      });
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(updateFloating);

    observer?.observe(sentinel);
    window.addEventListener("resize", updateFloating);
    window.addEventListener("scroll", updateFloating, { passive: true });
    updateFloating();

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateFloating);
      window.removeEventListener("scroll", updateFloating);
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return { floating, sentinelRef };
}

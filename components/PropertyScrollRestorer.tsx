"use client";

import { useEffect } from "react";

export const PROPERTY_SCROLL_KEY_PREFIX = "cheap-real-estate:scroll:";

export function PropertyScrollRestorer({ searchPath }: { searchPath: string }) {
  useEffect(() => {
    const savedPosition = window.sessionStorage.getItem(`${PROPERTY_SCROLL_KEY_PREFIX}${searchPath}`);
    if (!savedPosition) return;

    window.sessionStorage.removeItem(`${PROPERTY_SCROLL_KEY_PREFIX}${searchPath}`);
    const scrollY = Number(savedPosition);
    if (!Number.isFinite(scrollY) || scrollY < 0) return;

    const frameId = window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "auto" }));
    return () => window.cancelAnimationFrame(frameId);
  }, [searchPath]);

  return null;
}

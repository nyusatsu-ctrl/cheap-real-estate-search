"use client";

import { useEffect } from "react";

const VIEWED_PROPERTIES_KEY = "cheap-real-estate:viewed-properties";

export function ViewedPropertyTracker({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    try {
      const savedValue = window.localStorage.getItem(VIEWED_PROPERTIES_KEY);
      const savedIds = savedValue ? JSON.parse(savedValue) : [];
      const viewedIds = new Set<string>(Array.isArray(savedIds) ? savedIds.filter((id) => typeof id === "string") : []);
      viewedIds.add(propertyId);
      window.localStorage.setItem(VIEWED_PROPERTIES_KEY, JSON.stringify([...viewedIds]));
    } catch {
      // 閲覧記録が保存できなくても、物件詳細の表示は止めない。
    }
  }, [propertyId]);

  return null;
}

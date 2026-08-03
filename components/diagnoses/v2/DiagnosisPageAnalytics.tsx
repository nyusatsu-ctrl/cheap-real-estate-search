"use client";

import { useEffect } from "react";

export function DiagnosisPageAnalytics({ source }: { source: string }) {
  useEffect(() => {
    try {
      const key = "ecoloop_diagnosis_anonymous_id";
      let anonymousId = sessionStorage.getItem(key);
      if (!anonymousId) {
        anonymousId = crypto.randomUUID();
        sessionStorage.setItem(key, anonymousId);
      }
      void fetch("/api/diagnosis/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventName: "diagnosis_opened", anonymousId, source }),
        keepalive: true
      }).catch(() => undefined);
    } catch {
      // Measurement must never prevent the diagnosis from opening.
    }
  }, [source]);
  return null;
}

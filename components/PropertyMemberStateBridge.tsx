"use client";

import { useEffect } from "react";
import type { PropertyAccessPageState } from "@/lib/property-access";

export type PropertyMemberState =
  | { authenticated: false }
  | {
      authenticated: true;
      email: string;
      role: string;
      accessState: PropertyAccessPageState;
    };

let currentMemberState: PropertyMemberState | undefined;
const memberStateListeners = new Set<(member: PropertyMemberState) => void>();

export function PropertyMemberStateBridge({ member }: { member: PropertyMemberState }) {
  useEffect(() => {
    publishPropertyMemberState(member);
  }, [member]);

  return (
    <script
      id="property-member-state"
      type="application/json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: serializeMemberState(member) }}
    />
  );
}

export function getBridgedPropertyMemberState() {
  if (currentMemberState) return currentMemberState;
  if (typeof document === "undefined") return undefined;

  const serializedState = document.getElementById("property-member-state")?.textContent;
  if (!serializedState) return undefined;
  try {
    return JSON.parse(serializedState) as PropertyMemberState;
  } catch {
    return undefined;
  }
}

export function subscribeToPropertyMemberState(listener: (member: PropertyMemberState) => void) {
  memberStateListeners.add(listener);
  return () => {
    memberStateListeners.delete(listener);
  };
}

function publishPropertyMemberState(member: PropertyMemberState) {
  currentMemberState = member;
  memberStateListeners.forEach((listener) => listener(member));
}

function serializeMemberState(member: PropertyMemberState) {
  return JSON.stringify(member).replace(/</g, "\\u003c");
}

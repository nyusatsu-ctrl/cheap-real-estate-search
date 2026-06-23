#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const CRAWLER_SCOPE_FILTER = "crawler_source_id.not.is.null,crawl_status.in.(candidate,checked,test_reverted,rejected)";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = extractProjectRef(supabaseUrl);
const maskedProjectRef = maskProjectRef(projectRef);
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

console.log("Supabase diagnostics");
console.log(`Project Ref: ${maskedProjectRef ?? "unknown"}`);
console.log(`NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "missing"}`);
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? "set" : "missing"}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? "set" : "missing"}`);

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Supabase URL or service role key is missing.");
  process.exitCode = 1;
} else {
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const results = [
    ["properties", () => supabase.from("properties").select("id", { count: "exact", head: true })],
    ["crawler_candidates", () => supabase.from("properties").select("id", { count: "exact", head: true }).or(CRAWLER_SCOPE_FILTER)],
    ["published_properties", () => supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "published")],
    ["recent_7d_detected", () => supabase.from("properties").select("id", { count: "exact", head: true }).gte("first_detected_at", sevenDaysAgo)]
  ];

  let hasError = false;
  for (const [label, buildQuery] of results) {
    const { count, error } = await buildQuery();
    if (error) {
      hasError = true;
      console.log(`${label}: error`);
      console.error(`${label} error: ${error.message ?? "unknown error"}`);
    } else {
      console.log(`${label}: ${count ?? 0}`);
    }
  }

  if (hasError) process.exitCode = 1;
}

function extractProjectRef(value) {
  if (!value) return null;
  try {
    const host = new URL(value).hostname;
    const suffix = ".supabase.co";
    if (!host.endsWith(suffix)) return null;
    return host.slice(0, -suffix.length) || null;
  } catch {
    return null;
  }
}

function maskProjectRef(value) {
  if (!value) return null;
  if (value.length <= 8) return `${value.slice(0, 2)}...${value.slice(-2)}`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

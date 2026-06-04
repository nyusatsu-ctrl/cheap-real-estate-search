"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function requiredString(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  if (!value) throw new Error(`${key} is required`);
  return value;
}

export async function submitEstimateRequestAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/estimate?submitted=1");
  }

  const { error } = await supabase.from("estimate_requests").insert({
    property_title: optionalString(formData, "property_title") || null,
    property_url: optionalString(formData, "property_url") || null,
    requester_name: requiredString(formData, "name"),
    requester_email: requiredString(formData, "email"),
    requester_phone: optionalString(formData, "phone") || null,
    categories: formData.getAll("categories").map(String),
    timeline: optionalString(formData, "timeline") || null,
    message: optionalString(formData, "message") || null,
    status: "new"
  });

  if (error) throw new Error(error.message);
  redirect("/estimate?submitted=1");
}

"use server";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

const execFileAsync = promisify(execFile);

export async function runDefenseDiscoveryAction(formData: FormData) {
  await requireAdmin();
  const group = String(formData.get("group") ?? "all");
  await runDefenseScript("discover", group);
  revalidatePath("/admin/defense-crawl");
  redirect("/admin/defense-crawl");
}

export async function runDefenseCrawlAction(formData: FormData) {
  await requireAdmin();
  const group = String(formData.get("group") ?? "all");
  await runDefenseScript("crawl", group);
  revalidatePath("/admin/defense-crawl");
  revalidatePath("/admin/tender-candidates");
  redirect("/admin/defense-crawl");
}

async function runDefenseScript(command: string, group: string) {
  await execFileAsync("node", ["scripts/defense-crawler.mjs", command, `--group=${group}`], {
    cwd: process.cwd(),
    timeout: 120000,
    maxBuffer: 1024 * 1024 * 10
  });
}

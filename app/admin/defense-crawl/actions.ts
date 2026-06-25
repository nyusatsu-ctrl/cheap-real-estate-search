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

export async function runPortalTenderCrawlAction() {
  await requireAdmin();
  await execFileAsync("node", ["scripts/crawl-tenders.mjs", "--limit=300"], {
    cwd: process.cwd(),
    timeout: 180000,
    maxBuffer: 1024 * 1024 * 10
  });
  revalidatePath("/tenders");
  revalidatePath("/admin/defense-crawl");
  revalidatePath("/admin/tenders");
  redirect("/admin/defense-crawl");
}

export async function runDailyTenderCrawlAction() {
  await requireAdmin();
  await execFileAsync("node", ["scripts/crawl-tenders.mjs", "--limit=300"], {
    cwd: process.cwd(),
    timeout: 180000,
    maxBuffer: 1024 * 1024 * 10
  });
  await runDefenseScript("discover", "all");
  await runDefenseScript("crawl", "all");
  revalidatePath("/tenders");
  revalidatePath("/admin/defense-crawl");
  revalidatePath("/admin/tenders");
  revalidatePath("/admin/tender-candidates");
  redirect("/admin/defense-crawl");
}

async function runDefenseScript(command: string, group: string) {
  const args = ["scripts/defense-crawler.mjs", command, `--group=${group}`];
  if (command === "crawl") args.push("--max-sources=25");
  if (command === "discover") args.push("--max-sources=25");
  await execFileAsync("node", args, {
    cwd: process.cwd(),
    timeout: command === "crawl" ? 480000 : 180000,
    maxBuffer: 1024 * 1024 * 10
  });
}

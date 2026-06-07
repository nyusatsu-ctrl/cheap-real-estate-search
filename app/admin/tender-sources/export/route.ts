import { getCurrentAdmin } from "@/lib/admin";
import { getTenderSources } from "@/lib/tenders";

const columns = [
  "source_name",
  "organization_type",
  "region",
  "prefecture",
  "base_url",
  "tender_list_url",
  "open_counter_url",
  "result_url",
  "target_types",
  "source_format",
  "crawler_type",
  "crawler_difficulty",
  "crawl_priority",
  "crawl_frequency",
  "is_active",
  "robots_note",
  "terms_note",
  "admin_note"
];

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const sources = await getTenderSources();
  const body = [
    columns.join(","),
    ...sources.map((source) => columns.map((column) => csvCell(valueFor(source, column))).join(","))
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=tender-sources.csv"
    }
  });
}

function valueFor(source: Awaited<ReturnType<typeof getTenderSources>>[number], column: string) {
  if (column === "target_types") return (source.target_types ?? []).join("|");
  const value = source[column as keyof typeof source];
  if (typeof value === "boolean") return value ? "true" : "false";
  return value == null ? "" : String(value);
}

function csvCell(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

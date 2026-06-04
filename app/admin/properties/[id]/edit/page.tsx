import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { PropertyForm } from "@/components/PropertyForm";
import { getAdminProperty } from "@/lib/properties";
import { requireAdmin } from "@/lib/admin";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const property = await getAdminProperty(id);
  if (!property) notFound();

  return (
    <AdminShell email={admin.email}>
      <h2 className="mb-4 text-xl font-black text-slate-950">物件の編集</h2>
      <PropertyForm property={property} />
    </AdminShell>
  );
}

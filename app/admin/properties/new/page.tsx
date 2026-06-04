import { AdminShell } from "@/components/AdminShell";
import { PropertyForm } from "@/components/PropertyForm";
import { requireAdmin } from "@/lib/admin";

export default async function NewPropertyPage() {
  const admin = await requireAdmin();
  return (
    <AdminShell email={admin.email}>
      <h2 className="mb-4 text-xl font-black text-slate-950">物件の新規登録</h2>
      <PropertyForm />
    </AdminShell>
  );
}

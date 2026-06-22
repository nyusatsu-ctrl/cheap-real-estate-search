import { EcoloopAdminBrand } from "@/components/EcoloopAdminBrand";
import Link from "next/link";
import { signOutAction } from "@/app/admin/actions";

const defaultAdminMenuItems = [
  { href: "/admin/properties", label: "物件管理" },
  { href: "/admin/crawler-candidates", label: "取込候補" },
  { href: "/admin/estimates", label: "問い合わせ管理" },
  { href: "/admin/sales-contracts", label: "契約台帳" }
];

const salesAdminMenuItems = [
  { href: "/admin/sales-contracts", label: "契約台帳" },
  { href: "/admin/sales-contracts/new", label: "新規契約登録" },
  { href: "/admin/sales-lease-maturities", label: "リース満期" },
  { href: "/admin/sales-help", label: "使い方" }
];

type AdminShellProps = {
  children: React.ReactNode;
  email: string;
  systemName?: string;
};

export function AdminShell({ children, email, systemName = "格安不動産サーチ" }: AdminShellProps) {
  const isSalesAdmin = systemName === "契約管理システム";
  const menuItems = isSalesAdmin ? salesAdminMenuItems : defaultAdminMenuItems;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          {isSalesAdmin ? (
            <EcoloopAdminBrand showSystemName logoClassName="h-10" textClassName="text-base sm:text-lg" />
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-500">{systemName} 管理画面</p>
              <h1 className="text-2xl font-black text-slate-950">{systemName}</h1>
            </>
          )}
          <p className="mt-1 text-xs text-slate-500">{email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
              {item.label}
            </Link>
          ))}
          <form action={signOutAction}>
            <button className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
              ログアウト
            </button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { signOutAction } from "@/app/admin/actions";
import { getGpsNavigation } from "@/lib/gps/navigation";
import ecoLoopMobilityLogo from "./ecoloop-mobility-logo.png";

export function GpsAdminShell({
  children,
  email,
  isDemo
}: {
  children: React.ReactNode;
  email: string;
  isDemo: boolean;
}) {
  const navigation = getGpsNavigation(process.env.NODE_ENV);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Image
              src={ecoLoopMobilityLogo}
              alt="株式会社エコループ"
              priority
              sizes="(min-width: 640px) 64px, 48px"
              className="size-12 shrink-0 object-contain sm:size-16"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-700">MiCODUS MV930G-G</p>
              <h1 className="text-xl font-black leading-tight text-slate-950 sm:text-2xl">GPS車両管理システム</h1>
              <p className="mt-1 break-all text-xs text-slate-500">{email}</p>
            </div>
          </div>
          <form action={signOutAction}>
            <button className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
              ログアウト
            </button>
          </form>
        </div>
        <nav aria-label="GPS管理メニュー" className="mt-4 flex flex-wrap gap-2">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-brand-500 hover:text-brand-700 focus-ring"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {isDemo && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          デモデータ表示中です。実データではありません。GPS_DEMO_MODE=true のときだけ表示されます。
        </div>
      )}
      {children}
    </div>
  );
}

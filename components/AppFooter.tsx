"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BUSINESS_INFO } from "@/lib/legal";

const footerLinks = [
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/legal", label: "特定商取引法に基づく表記" },
  { href: "/contact", label: "お問い合わせ" }
];

const tenderFooterLinks = [
  { href: "/tenders/terms", label: "利用規約" },
  { href: "/tenders/privacy", label: "プライバシーポリシー" },
  { href: "/tenders/legal", label: "特定商取引法に基づく表記" },
  { href: "/contact", label: "お問い合わせ" }
];

export function AppFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/income-potential")) return <IncomePotentialFooter />;

  const links = pathname.startsWith("/tenders") || pathname.startsWith("/favorites") || pathname.startsWith("/notifications")
    ? tenderFooterLinks
    : footerLinks;

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <p className="font-semibold text-slate-700">© {BUSINESS_INFO.companyName}</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brand-700">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

function IncomePotentialFooter() {
  return (
    <footer className="border-t border-[#2a2418] bg-[#0b0a0f]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-stone-400 md:flex-row md:items-center md:justify-between">
        <p className="font-semibold text-stone-300">年収ポテンシャル診断</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-[#f4d58d]">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

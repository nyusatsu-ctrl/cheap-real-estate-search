import Link from "next/link";
import { BUSINESS_INFO } from "@/lib/legal";

const footerLinks = [
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/legal", label: "特定商取引法に基づく表記" },
  { href: "/contact", label: "お問い合わせ" }
];

export function AppFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <p className="font-semibold text-slate-700">© {BUSINESS_INFO.companyName}</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brand-700">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
